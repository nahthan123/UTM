/**
 * TASK 11: TACTICAL DECONFLICTION ZUSTAND STORE
 * Manages tactical conflict state, resolution sessions, AI mode toggling, and operator approvals.
 */

import { create } from 'zustand';
import {
  ConflictDetectionResult,
  TacticalResolutionSession,
  ResolutionOption
} from '../types/tactical';
import { Part5InputFeed } from '../types/monitoring';
import { tacticalClient } from '../services/tactical/tacticalClient';
import { part5Bridge } from '../services/part5Bridge/Part5ExportBridge';

interface TacticalStoreState {
  conflicts: ConflictDetectionResult[];
  sessions: Record<string, TacticalResolutionSession>;
  selectedSessionId: string | null;
  previewedOption: ResolutionOption | null;
  aiEnabled: boolean;
  tacticalPanelOpen: boolean;
  reportModalSessionId: string | null;
  backendConnected: boolean;
  lastEvaluationTime: string;

  // Actions
  setAiEnabled: (enabled: boolean) => void;
  setTacticalPanelOpen: (open: boolean) => void;
  toggleTacticalPanel: () => void;
  selectSession: (sessionId: string | null) => void;
  setPreviewedOption: (option: ResolutionOption | null) => void;
  openReportModal: (sessionId: string) => void;
  closeReportModal: () => void;

  // Operator Actions
  approveResolution: (sessionId: string, optionId: string) => Promise<void>;
  rejectResolution: (sessionId: string, reason?: string) => Promise<void>;

  // Bridge Integration
  processFeedSnapshot: (feed: Part5InputFeed) => Promise<void>;
  initializeTacticalBridge: () => () => void;
}

export const useTacticalStore = create<TacticalStoreState>((set, get) => ({
  conflicts: [],
  sessions: {},
  selectedSessionId: null,
  previewedOption: null,
  aiEnabled: true,
  tacticalPanelOpen: false,
  reportModalSessionId: null,
  backendConnected: false,
  lastEvaluationTime: new Date().toISOString(),

  setAiEnabled: (enabled: boolean) => set({ aiEnabled: enabled }),
  setTacticalPanelOpen: (open: boolean) => set({ tacticalPanelOpen: open }),
  toggleTacticalPanel: () => set((s) => ({ tacticalPanelOpen: !s.tacticalPanelOpen })),
  selectSession: (id: string | null) => set({ selectedSessionId: id }),
  setPreviewedOption: (opt: ResolutionOption | null) => set({ previewedOption: opt }),
  openReportModal: (sessionId: string) => set({ reportModalSessionId: sessionId }),
  closeReportModal: () => set({ reportModalSessionId: null }),

  approveResolution: async (sessionId: string, optionId: string) => {
    const updated = await tacticalClient.approveOption(sessionId, optionId);
    if (updated) {
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: updated,
        },
      }));
    } else {
      // Local optimistic update
      set((state) => {
        const s = state.sessions[sessionId];
        if (!s) return state;
        const nowIso = new Date().toISOString();
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...s,
              lifecycle_state: 'EXECUTING',
              selected_option_id: optionId,
              approved_by: 'OPERATOR-DANANG-UTM',
              approval_timestamp: nowIso,
              updated_at: nowIso,
            },
          },
        };
      });
    }
  },

  rejectResolution: async (sessionId: string, reason?: string) => {
    const updated = await tacticalClient.rejectOption(sessionId, reason);
    if (updated) {
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: updated,
        },
      }));
    } else {
      // Local optimistic update
      set((state) => {
        const s = state.sessions[sessionId];
        if (!s) return state;
        const nowIso = new Date().toISOString();
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...s,
              lifecycle_state: 'REJECTED',
              updated_at: nowIso,
            },
          },
        };
      });
    }
  },

  processFeedSnapshot: async (feed: Part5InputFeed) => {
    const useAi = get().aiEnabled;
    const { conflicts, sessions } = await tacticalClient.sendFeed(feed, useAi);
    const sessionsMap: Record<string, TacticalResolutionSession> = { ...get().sessions };

    sessions.forEach((s) => {
      // Preserve local approval state if already executing
      const existing = sessionsMap[s.session_id];
      if (existing && (existing.lifecycle_state === 'EXECUTING' || existing.lifecycle_state === 'VERIFIED')) {
        sessionsMap[s.session_id] = {
          ...s,
          lifecycle_state: existing.lifecycle_state,
          selected_option_id: existing.selected_option_id,
          approved_by: existing.approved_by,
        };
      } else {
        sessionsMap[s.session_id] = s;
      }
    });

    set({
      conflicts,
      sessions: sessionsMap,
      backendConnected: tacticalClient.getIsOnline(),
      lastEvaluationTime: new Date().toISOString(),
      // Auto-open panel if critical conflict appears and not yet opened
      tacticalPanelOpen: get().tacticalPanelOpen || conflicts.some((c) => c.severity === 'CRITICAL'),
    });
  },

  initializeTacticalBridge: () => {
    // Automatically subscribe to Part 4 export bridge
    const unsubscribe = part5Bridge.subscribe((feed) => {
      get().processFeedSnapshot(feed);
    });
    // Check initial health
    tacticalClient.checkHealth().then((online) => {
      set({ backendConnected: online });
    });
    return unsubscribe;
  },
}));
