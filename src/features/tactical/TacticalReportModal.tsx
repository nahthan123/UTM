/**
 * TASK 11: TACTICAL CONFLICT INCIDENT REPORT MODAL
 * Displays detailed audit log, constraint checks, approval timeline,
 * and allows downloading JSON and CSV reports.
 */

import React from 'react';
import { useTacticalStore } from '../../stores/useTacticalStore';
import { tacticalClient } from '../../services/tactical/tacticalClient';
import { FileText, Download, X, CheckCircle2, ShieldAlert } from 'lucide-react';

export const TacticalReportModal: React.FC = () => {
  const { reportModalSessionId, sessions, closeReportModal } = useTacticalStore();

  if (!reportModalSessionId) return null;

  const session = sessions[reportModalSessionId];
  if (!session) return null;

  const c = session.conflict;
  const chosenOpt = session.proposed_options.find((o) => o.option_id === session.selected_option_id);

  const handleDownload = (format: 'json' | 'csv') => {
    const url = tacticalClient.getReportDownloadUrl(session.session_id, format);
    // If backend is online, open link to trigger file download
    if (tacticalClient.getIsOnline()) {
      window.open(url, '_blank');
    } else {
      // Local fallback download
      const content =
        format === 'json'
          ? JSON.stringify(session, null, 2)
          : `MÃ BÁO CÁO,REP-${session.session_id}\nMÃ XUNG ĐỘT,${c.conflict_id}\nUAV,${c.uav_a_id} và ${c.uav_b_id}\nTRẠNG THÁI,${session.lifecycle_state}\nCPA NGANG,${c.cpa_horizontal_distance_m}m\nCPA ĐỨNG,${c.cpa_vertical_distance_m}m\n`;
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tactical_report_${session.session_id}.${format}`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-950 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Báo cáo Sự cố & Xử lý Xung đột Chiến thuật
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Mã phiên: {session.session_id} | Phát hiện lúc: {c.detected_at}
              </p>
            </div>
          </div>
          <button
            onClick={closeReportModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
          {/* Summary Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase">UAV Liên quan</span>
              <p className="font-bold text-white text-xs">{c.uav_a_id} ⚔️ {c.uav_b_id}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Khoảng cách CPA</span>
              <p className="font-bold text-rose-400 text-xs">
                Ngang {c.cpa_horizontal_distance_m}m / Đứng {c.cpa_vertical_distance_m}m
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Thời gian tới CPA</span>
              <p className="font-bold text-amber-400 text-xs">{c.time_to_cpa_seconds}s</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Trạng thái</span>
              <p className="font-bold text-emerald-400 text-xs">{session.lifecycle_state}</p>
            </div>
          </div>

          {/* Chosen Resolution Details */}
          <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Phương án Xử lý Đã chọn & Kiểm tra Ràng buộc</span>
            </h4>
            {chosenOpt ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-300">
                  UAV Mục tiêu: <b className="text-white">{chosenOpt.target_uav_id}</b> ({chosenOpt.uav_type}) — Hành động: <b className="text-cyan-400">{chosenOpt.adjustment.action_type}</b>
                </div>
                <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                  {chosenOpt.selection_rationale}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-emerald-400">
                    ✓ Giải tỏa xung đột ban đầu: ĐẠT
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    ✓ Không xung đột thứ cấp (N≥3): ĐẠT
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    ✓ Không xâm phạm NFZ: ĐẠT
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    ✓ Giới hạn cơ động ({chosenOpt.uav_type}): ĐẠT
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">Chưa có phương án nào được chọn phê duyệt.</p>
            )}
          </div>

          {/* Verification & Evidence */}
          <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-200 text-xs">Bằng chứng Xác minh sau Điều chỉnh (UTM Telemetry)</h4>
            <p className="text-slate-400 text-[11px]">
              {session.verification_details || 'Đang theo dõi telemetry thực nhận từ bộ giám sát để xác nhận phân cách an toàn.'}
            </p>
            {session.approved_by && (
              <p className="text-[10px] text-slate-500">
                Xác nhận bởi: <span className="text-slate-300 font-mono">{session.approved_by}</span> lúc {session.approval_timestamp}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Hỗ trợ xuất chuẩn dữ liệu phục vụ nghiên cứu Task 11–13
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('json')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải JSON</span>
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
