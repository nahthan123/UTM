import { describe, it, expect, beforeEach } from 'vitest';
import { useTacticalStore } from '../src/stores/useTacticalStore';
import { Part5InputFeed } from '../src/types/monitoring';

describe('Task 11 & 13: Tactical Frontend Integration', () => {
  beforeEach(async () => {
    useTacticalStore.setState({
      conflicts: [],
      sessions: {},
      selectedSessionId: null,
      previewedOption: null,
      aiEnabled: true,
      tacticalPanelOpen: false,
    });
    try {
      await fetch('http://127.0.0.1:8000/api/tactical/reset', { method: 'POST' });
    } catch {
      // ignore if backend not reachable
    }
  });

  const mockFeedNormal: Part5InputFeed = {
    feed_timestamp: new Date().toISOString(),
    active_uav_states: {
      'UAV-01': {
        uav_id: 'UAV-01',
        position: { latitude: 16.0500, longitude: 108.2000, altitude_m: 100, altitude_reference: 'AGL' },
        velocity: { ground_speed_mps: 15, vertical_speed_mps: 0, heading_deg: 90 },
        timestamp: new Date().toISOString(),
        status: 'FLYING',
        data_quality: {
          freshness: 'FRESH',
          confidence: 'HIGH',
          sim_time_utc: new Date().toISOString(),
          message_created_at_utc: new Date().toISOString(),
          received_at_wall_clock_utc: new Date().toISOString(),
          freshness_age_ms: 10,
          latency_ms: 10,
          last_sequence: 1,
          sequence_gap_count: 0,
          out_of_order_count: 0,
          is_stale: false,
          is_lost: false,
          is_invalid: false,
        },
        trail: [],
      },
      'UAV-02': {
        uav_id: 'UAV-02',
        position: { latitude: 16.0700, longitude: 108.2000, altitude_m: 100, altitude_reference: 'AGL' }, // ~2.2km away
        velocity: { ground_speed_mps: 15, vertical_speed_mps: 0, heading_deg: 90 },
        timestamp: new Date().toISOString(),
        status: 'FLYING',
        data_quality: {
          freshness: 'FRESH',
          confidence: 'HIGH',
          sim_time_utc: new Date().toISOString(),
          message_created_at_utc: new Date().toISOString(),
          received_at_wall_clock_utc: new Date().toISOString(),
          freshness_age_ms: 10,
          latency_ms: 10,
          last_sequence: 1,
          sequence_gap_count: 0,
          out_of_order_count: 0,
          is_stale: false,
          is_lost: false,
          is_invalid: false,
        },
        trail: [],
      },
    },
    airspace_alerts: [],
    system_integrity: {
      total_uavs: 2,
      high_confidence_count: 2,
      degraded_count: 0,
      stale_count: 0,
      invalid_count: 0,
    },
  };

  const mockFeedConflict: Part5InputFeed = {
    feed_timestamp: new Date().toISOString(),
    active_uav_states: {
      'UAV-01': {
        uav_id: 'UAV-01',
        position: { latitude: 16.0500, longitude: 108.2000, altitude_m: 100, altitude_reference: 'AGL' },
        velocity: { ground_speed_mps: 10, vertical_speed_mps: 0, heading_deg: 90 },
        timestamp: new Date().toISOString(),
        status: 'FLYING',
        data_quality: {
          freshness: 'FRESH',
          confidence: 'HIGH',
          sim_time_utc: new Date().toISOString(),
          message_created_at_utc: new Date().toISOString(),
          received_at_wall_clock_utc: new Date().toISOString(),
          freshness_age_ms: 10,
          latency_ms: 10,
          last_sequence: 1,
          sequence_gap_count: 0,
          out_of_order_count: 0,
          is_stale: false,
          is_lost: false,
          is_invalid: false,
        },
        trail: [],
      },
      'UAV-02': {
        uav_id: 'UAV-02',
        position: { latitude: 16.0500, longitude: 108.2018, altitude_m: 100, altitude_reference: 'AGL' }, // Converging ~190m (< 250m threshold)
        velocity: { ground_speed_mps: 10, vertical_speed_mps: 0, heading_deg: 270 },
        timestamp: new Date().toISOString(),
        status: 'FLYING',
        data_quality: {
          freshness: 'FRESH',
          confidence: 'HIGH',
          sim_time_utc: new Date().toISOString(),
          message_created_at_utc: new Date().toISOString(),
          received_at_wall_clock_utc: new Date().toISOString(),
          freshness_age_ms: 10,
          latency_ms: 10,
          last_sequence: 1,
          sequence_gap_count: 0,
          out_of_order_count: 0,
          is_stale: false,
          is_lost: false,
          is_invalid: false,
        },
        trail: [],
      },
    },
    airspace_alerts: [],
    system_integrity: {
      total_uavs: 2,
      high_confidence_count: 2,
      degraded_count: 0,
      stale_count: 0,
      invalid_count: 0,
    },
  };

  it('Kịch bản 1: Bay bình thường không phát cảnh báo xung đột giả', async () => {
    await useTacticalStore.getState().processFeedSnapshot(mockFeedNormal);
    const conflicts = useTacticalStore.getState().conflicts;
    expect(conflicts.length).toBe(0);
  });

  it('Kịch bản 3: Phát hiện xung đột thời gian thực, mở phiên xử lý và đề xuất phương án', async () => {
    await useTacticalStore.getState().processFeedSnapshot(mockFeedConflict);
    const conflicts = useTacticalStore.getState().conflicts;
    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    const c = conflicts[0];
    expect(c.uav_a_id).toBe('UAV-01');
    expect(c.uav_b_id).toBe('UAV-02');

    const sessions = Object.values(useTacticalStore.getState().sessions);
    expect(sessions.length).toBeGreaterThanOrEqual(1);

    const session = sessions[0];
    expect(session.lifecycle_state).toBe('PENDING_APPROVAL');
    expect(session.proposed_options.length).toBeGreaterThanOrEqual(1);
    expect(session.proposed_options[0].constraint_check.is_feasible).toBe(true);
  });

  it('Người vận hành phê duyệt phương án -> chuyển sang EXECUTING', async () => {
    await useTacticalStore.getState().processFeedSnapshot(mockFeedConflict);
    const sessions = Object.values(useTacticalStore.getState().sessions);
    const session = sessions[0];
    const opt = session.proposed_options[0];

    await useTacticalStore.getState().approveResolution(session.session_id, opt.option_id);

    const updatedSession = useTacticalStore.getState().sessions[session.session_id];
    expect(updatedSession.lifecycle_state).toBe('EXECUTING');
    expect(updatedSession.selected_option_id).toBe(opt.option_id);
    expect(updatedSession.approved_by).toBe('OPERATOR-DANANG-UTM');
  });

  it('Người vận hành từ chối phương án -> chuyển sang REJECTED', async () => {
    await useTacticalStore.getState().processFeedSnapshot(mockFeedConflict);
    const sessions = Object.values(useTacticalStore.getState().sessions);
    const session = sessions[0];

    await useTacticalStore.getState().rejectResolution(session.session_id, 'Kiểm soát bằng tay');

    const updatedSession = useTacticalStore.getState().sessions[session.session_id];
    expect(updatedSession.lifecycle_state).toBe('REJECTED');
  });

  it('Hỗ trợ chuyển đổi chế độ AI ON / AI OFF minh bạch', () => {
    useTacticalStore.getState().setAiEnabled(false);
    expect(useTacticalStore.getState().aiEnabled).toBe(false);

    useTacticalStore.getState().setAiEnabled(true);
    expect(useTacticalStore.getState().aiEnabled).toBe(true);
  });

  it('Đề xuất phương án kèm quỹ đạo 3D tránh va chạm và chuyển sang VERIFIED khi tách an toàn', async () => {
    await useTacticalStore.getState().processFeedSnapshot(mockFeedConflict);
    const sessions = Object.values(useTacticalStore.getState().sessions);
    const session = sessions[0];
    expect(session.proposed_options.length).toBeGreaterThanOrEqual(2);
    expect(session.proposed_options[0].projected_trajectory.length).toBeGreaterThanOrEqual(5);

    await useTacticalStore
      .getState()
      .approveResolution(session.session_id, session.proposed_options[0].option_id);
    expect(useTacticalStore.getState().sessions[session.session_id].lifecycle_state).toBe('EXECUTING');

    // Once UAVs separate cleanly (mockFeedNormal), EXECUTING session transitions to VERIFIED
    await useTacticalStore.getState().processFeedSnapshot(mockFeedNormal);
    expect(useTacticalStore.getState().sessions[session.session_id].lifecycle_state).toBe('VERIFIED');
  });
});
