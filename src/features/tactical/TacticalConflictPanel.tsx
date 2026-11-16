/**
 * TASK 11: TACTICAL CONFLICT & RESOLUTION PANEL
 * Renders tactical conflicts, CPA metrics, candidate resolution options,
 * 7-point constraint verification, AI scoring, and operator approve/reject controls.
 */

import React, { useState } from 'react';
import { useTacticalStore } from '../../stores/useTacticalStore';
import { useMonitoringStore } from '../../stores/useMonitoringStore';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  X,
  Sparkles,
  FileText,
  Activity,
  ArrowUpRight,
  Gauge,
  Compass,
  Clock,
  Server
} from 'lucide-react';

export const TacticalConflictPanel: React.FC = () => {
  const {
    conflicts,
    sessions,
    selectedSessionId,
    previewedOption,
    aiEnabled,
    tacticalPanelOpen,
    backendConnected,
    setAiEnabled,
    setTacticalPanelOpen,
    selectSession,
    setPreviewedOption,
    openReportModal,
    approveResolution,
    rejectResolution,
  } = useTacticalStore();

  const { focusUav } = useMonitoringStore();
  const [rejectModalSessionId, setRejectModalSessionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Phi công báo kiểm soát thủ công');

  if (!tacticalPanelOpen) return null;

  const sessionList = Object.values(sessions);
  const activeSession = selectedSessionId
    ? sessions[selectedSessionId]
    : sessionList[0] || null;

  const handleApprove = async (sessionId: string, optionId: string) => {
    await approveResolution(sessionId, optionId);
  };

  const handleReject = async (sessionId: string) => {
    await rejectResolution(sessionId, rejectReason);
    setRejectModalSessionId(null);
  };

  return (
    <div className="absolute top-16 left-4 z-30 w-96 max-h-[calc(100vh-8rem)] flex flex-col bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
              <span>Xử lý Xung đột Chiến thuật</span>
              <span className="text-[10px] font-mono text-cyan-400">(Khối 5)</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Server className={`w-3 h-3 ${backendConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
                {backendConnected ? 'FastAPI 8000: Online' : 'Fallback Engine: Active'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setTacticalPanelOpen(false)}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          title="Đóng bảng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* AI Mode Selector */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className={`w-3.5 h-3.5 ${aiEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="font-semibold text-[11px]">Chế độ Phân tích:</span>
        </div>
        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setAiEnabled(false)}
            className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${
              !aiEnabled ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI OFF (Quy tắc)
          </button>
          <button
            onClick={() => setAiEnabled(true)}
            className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${
              aiEnabled ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI ON (Học máy)
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
        {sessionList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
            <p className="text-xs font-medium text-slate-400">Không phận An toàn</p>
            <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto">
              Không phát hiện nguy cơ vi phạm phân cách 3D hoặc vùng hạn chế trong cửa sổ dự báo 60s.
            </p>
          </div>
        ) : (
          sessionList.map((session) => {
            const c = session.conflict;
            const isSelected = activeSession?.session_id === session.session_id;

            return (
              <div
                key={session.session_id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-rose-500/80 shadow-lg shadow-rose-950/20'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Conflict Card Header */}
                <div
                  className="cursor-pointer"
                  onClick={() => selectSession(session.session_id)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        c.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {c.severity === 'CRITICAL' ? 'NGUY HIỂM (CPA)' : 'CẢNH BÁO'}
                    </span>
                    <span className="font-mono text-[10px] text-cyan-400 font-semibold">
                      T_CPA: {c.time_to_cpa_seconds}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        focusUav(c.uav_a_id);
                      }}
                      className="hover:text-cyan-400 underline decoration-dotted cursor-pointer"
                    >
                      {c.uav_a_id}
                    </span>
                    <span className="text-rose-400 font-mono text-[11px]">⚔️</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        focusUav(c.uav_b_id);
                      }}
                      className="hover:text-cyan-400 underline decoration-dotted cursor-pointer"
                    >
                      {c.uav_b_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    <div>CPA Ngang: <span className="text-white font-bold">{c.cpa_horizontal_distance_m}m</span></div>
                    <div>CPA Đứng: <span className="text-white font-bold">{c.cpa_vertical_distance_m}m</span></div>
                    <div>Độ tin cậy: <span className="text-emerald-400">{c.data_confidence}</span></div>
                    <div>Trạng thái: <span className="text-amber-400 font-bold">{session.lifecycle_state}</span></div>
                  </div>

                  {c.requires_altitude_alignment && (
                    <div className="mt-1.5 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/60">
                      ⚠️ Mốc độ cao khác biệt (AGL vs MSL), không trừ trực tiếp.
                    </div>
                  )}
                </div>

                {/* Candidate Resolution Options */}
                {isSelected && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">
                        Phương án Đề xuất ({session.proposed_options.length})
                      </span>
                      <button
                        onClick={() => openReportModal(session.session_id)}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                        title="Xem & Xuất báo cáo"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Báo cáo sự cố</span>
                      </button>
                    </div>

                    {session.proposed_options.map((opt) => {
                      const isPreviewing = previewedOption?.option_id === opt.option_id;
                      const check = opt.constraint_check;

                      return (
                        <div
                          key={opt.option_id}
                          className={`p-2 rounded border text-[11px] ${
                            check.is_feasible
                              ? 'bg-slate-950 border-slate-700/80'
                              : 'bg-rose-950/20 border-rose-900/60 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-cyan-300">
                              {opt.target_uav_id}: {opt.adjustment.action_type}
                            </span>
                            <span
                              className={`px-1 rounded text-[9px] font-bold ${
                                check.is_feasible
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {check.is_feasible ? 'KHẢ THI' : 'VI PHẠM'}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 space-y-0.5 mb-1.5">
                            {opt.adjustment.altitude_delta_m && (
                              <div>Độ cao: <b className="text-white">{(opt.adjustment.altitude_delta_m > 0 ? '+' : '') + opt.adjustment.altitude_delta_m}m</b> (Đích: {opt.adjustment.target_altitude_m}m)</div>
                            )}
                            {opt.adjustment.speed_delta_mps && (
                              <div>Tốc độ: <b className="text-white">{(opt.adjustment.speed_delta_mps > 0 ? '+' : '') + opt.adjustment.speed_delta_mps} m/s</b> (Đích: {opt.adjustment.target_ground_speed_mps} m/s)</div>
                            )}
                            {opt.adjustment.heading_delta_deg && (
                              <div>Hướng bay: <b className="text-white">{(opt.adjustment.heading_delta_deg > 0 ? '+' : '') + opt.adjustment.heading_delta_deg}°</b> (Đích: {opt.adjustment.target_heading_deg}°)</div>
                            )}
                          </div>

                          {/* Rationale & Scoring */}
                          <div className="text-[10px] text-slate-300 bg-slate-900 p-1.5 rounded mb-2 font-mono">
                            {opt.selection_rationale}
                          </div>

                          {/* Rejection reasons if infeasible */}
                          {!check.is_feasible && (
                            <div className="text-[10px] text-rose-400 mb-2 space-y-0.5">
                              {check.rejection_reasons.map((r, i) => (
                                <div key={i}>• {r}</div>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => setPreviewedOption(isPreviewing ? null : opt)}
                              className={`flex-1 py-1 px-2 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${
                                isPreviewing
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>{isPreviewing ? 'Đang xem 3D' : 'Xem trước 3D'}</span>
                            </button>

                            {check.is_feasible && session.lifecycle_state === 'PENDING_APPROVAL' && (
                              <>
                                <button
                                  onClick={() => handleApprove(session.session_id, opt.option_id)}
                                  className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                                  title="Xác nhận phê duyệt phương án"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  onClick={() => setRejectModalSessionId(session.session_id)}
                                  className="py-1 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                                  title="Từ chối phương án"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Từ chối</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Operational Lifecycle Status Bar */}
                    {session.lifecycle_state !== 'PENDING_APPROVAL' && (
                      <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-700 text-[10px]">
                        <div className="flex items-center justify-between text-slate-300 mb-1">
                          <span>Quy trình xử lý:</span>
                          <span className="font-bold text-cyan-400">{session.lifecycle_state}</span>
                        </div>
                        {session.approved_by && (
                          <div className="text-slate-400">Phê duyệt bởi: {session.approved_by}</div>
                        )}
                        {session.verification_details && (
                          <div className="text-emerald-400 mt-1 font-mono">
                            ✓ {session.verification_details}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalSessionId && (
        <div className="p-3 bg-rose-950/90 border-t border-rose-800 space-y-2 text-xs">
          <div className="font-bold text-rose-200">Xác nhận Từ chối Phương án:</div>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
            placeholder="Lý do từ chối..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectModalSessionId(null)}
              className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px]"
            >
              Hủy
            </button>
            <button
              onClick={() => handleReject(rejectModalSessionId)}
              className="px-2 py-1 bg-rose-600 text-white font-bold rounded text-[10px]"
            >
              Xác nhận từ chối
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
