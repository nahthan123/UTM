"""
TASK 11: CONFLICT INCIDENT REPORT GENERATOR
Exports comprehensive incident reports in JSON and CSV formats, detailing
initial state, predicted CPA, evaluated options, chosen resolution, constraint audit,
operator sign-off, simulator feedback, post-adjustment telemetry verification, and operational limitations.
"""

import json
import csv
import io
import datetime
from typing import Dict, Any, List
from backend.app.models.schemas import (
    TacticalResolutionSession,
    ConflictIncidentReport
)

class IncidentReportGenerator:
    @staticmethod
    def generate_report_object(
        session: TacticalResolutionSession,
        state_history: List[Dict[str, Any]],
        operator_notes: str = ""
    ) -> ConflictIncidentReport:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        selected_opt = next(
            (o for o in session.proposed_options if o.option_id == session.selected_option_id),
            None
        )

        chosen_dict = selected_opt.model_dump() if selected_opt else None
        constraint_audit = selected_opt.constraint_check.model_dump() if selected_opt else None

        return ConflictIncidentReport(
            report_id=f"REP-{session.session_id}",
            conflict_id=session.conflict.conflict_id,
            uav_ids=[session.conflict.uav_a_id, session.conflict.uav_b_id],
            detected_at=session.conflict.detected_at,
            resolved_at=session.updated_at if session.lifecycle_state == 'VERIFIED' else None,
            cpa_projected_m=session.conflict.cpa_horizontal_distance_m,
            actual_min_observed_distance_m=None,
            lifecycle_history=state_history,
            chosen_resolution=chosen_dict,
            constraint_audit=constraint_audit,
            final_outcome=f"Trạng thái kết thúc: {session.lifecycle_state}. {session.verification_details or ''}",
            operator_notes=operator_notes,
            generated_at=now_iso
        )

    @classmethod
    def export_to_json_str(cls, report: ConflictIncidentReport) -> str:
        return json.dumps(report.model_dump(), indent=2, ensure_ascii=False)

    @classmethod
    def export_to_csv_str(cls, report: ConflictIncidentReport) -> str:
        output = io.StringIO()
        writer = csv.writer(output)

        # Header section
        writer.writerow(["MÃ BÁO CÁO", report.report_id])
        writer.writerow(["MÃ XUNG ĐỘT", report.conflict_id])
        writer.writerow(["DANH SÁCH UAV", ", ".join(report.uav_ids)])
        writer.writerow(["THỜI ĐIỂM PHÁT HIỆN", report.detected_at])
        writer.writerow(["THỜI ĐIỂM XÁC MINH AN TOÀN", report.resolved_at or "CHƯA XÁC MINH"])
        writer.writerow(["CPA DỰ KIẾN (NGANG)", f"{report.cpa_projected_m} m"])
        writer.writerow(["KẾT QUẢ CUỐI CÙNG", report.final_outcome])
        writer.writerow([])

        # Resolution details
        writer.writerow(["=== CHI TIẾT PHƯƠNG ÁN ĐÃ CHỌN ==="])
        if report.chosen_resolution:
            chosen = report.chosen_resolution
            adj = chosen.get('adjustment', {})
            writer.writerow(["Mã phương án", chosen.get('option_id')])
            writer.writerow(["UAV mục tiêu", chosen.get('target_uav_id')])
            writer.writerow(["Hành động", adj.get('action_type')])
            writer.writerow(["Độ cao đích", f"{adj.get('target_altitude_m')} m" if adj.get('target_altitude_m') else "N/A"])
            writer.writerow(["Vận tốc đích", f"{adj.get('target_ground_speed_mps')} m/s" if adj.get('target_ground_speed_mps') else "N/A"])
            writer.writerow(["Hướng bay đích", f"{adj.get('target_heading_deg')} độ" if adj.get('target_heading_deg') else "N/A"])
            writer.writerow(["Lý giải lựa chọn", chosen.get('selection_rationale')])
        else:
            writer.writerow(["Không có phương án nào được chọn"])
        writer.writerow([])

        # Lifecycle timeline
        writer.writerow(["=== DÒNG THỜI GIAN TRẠNG THÁI (LIFECYCLE TIMELINE) ==="])
        writer.writerow(["Thời gian (UTC)", "Trạng thái trước", "Trạng thái mới", "Ghi chú"])
        for step in report.lifecycle_history:
            writer.writerow([
                step.get('timestamp'),
                step.get('from_state'),
                step.get('to_state'),
                step.get('details')
            ])

        return output.getvalue()
