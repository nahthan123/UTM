"""
TASK 11: TACTICAL RESOLUTION STATE MACHINE
Manages the rigorous 11-step lifecycle:
DETECTED -> ANALYZING -> PROPOSED -> VALIDATED -> PENDING_APPROVAL -> APPROVED -> SENT -> ACCEPTED -> EXECUTING -> COMPLETED -> VERIFIED
Branches: REJECTED, INVALID, TIMEOUT, FAILED, NO_FEASIBLE_SOLUTION.
"""

from typing import Dict, Any, Optional, List
import datetime
import uuid
from backend.app.models.schemas import (
    TacticalResolutionSession,
    TacticalResolutionLifecycle,
    ConflictDetectionResult,
    ResolutionOption,
    ObservedUAVStatePayload
)
from backend.app.services.execution.mock_adapter import ITacticalExecutionAdapter, MockExecutionAdapter
from backend.app.services.spatial_math import calculate_cpa

class TacticalStateMachine:
    def __init__(self, execution_adapter: Optional[ITacticalExecutionAdapter] = None):
        self.adapter = execution_adapter or MockExecutionAdapter()
        self.sessions: Dict[str, TacticalResolutionSession] = {}
        self.history_logs: Dict[str, List[Dict[str, Any]]] = {}

    def _log_state_transition(
        self,
        session_id: str,
        from_state: TacticalResolutionLifecycle,
        to_state: TacticalResolutionLifecycle,
        details: str = ""
    ):
        entry = {
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'from_state': from_state,
            'to_state': to_state,
            'details': details
        }
        if session_id not in self.history_logs:
            self.history_logs[session_id] = []
        self.history_logs[session_id].append(entry)

    def create_session(
        self,
        conflict: ConflictDetectionResult,
        proposed_options: List[ResolutionOption]
    ) -> TacticalResolutionSession:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        session_id = f"SES-{conflict.conflict_id}"

        has_feasible = any(o.status == 'FEASIBLE' for o in proposed_options)
        initial_state: TacticalResolutionLifecycle = 'PENDING_APPROVAL' if has_feasible else 'NO_FEASIBLE_SOLUTION'

        session = TacticalResolutionSession(
            session_id=session_id,
            conflict=conflict,
            lifecycle_state=initial_state,
            proposed_options=proposed_options,
            selected_option_id=proposed_options[0].option_id if proposed_options else None,
            created_at=now_iso,
            updated_at=now_iso
        )
        self.sessions[session_id] = session
        self._log_state_transition(session_id, 'DETECTED', initial_state, "Khởi tạo phiên phân tích xung đột")
        return session

    def approve_option(
        self,
        session_id: str,
        option_id: str,
        operator_id: str = "OPERATOR-DANANG-UTM"
    ) -> TacticalResolutionSession:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Không tìm thấy phiên xử lý {session_id}")

        if session.lifecycle_state not in ['PENDING_APPROVAL', 'PROPOSED']:
            raise ValueError(f"Không thể phê duyệt từ trạng thái {session.lifecycle_state}")

        selected = next((o for o in session.proposed_options if o.option_id == option_id), None)
        if not selected:
            raise ValueError(f"Phương án {option_id} không tồn tại trong phiên")

        if not selected.constraint_check.is_feasible:
            self._log_state_transition(session_id, session.lifecycle_state, 'INVALID', "Phương án vi phạm ràng buộc")
            session.lifecycle_state = 'INVALID'
            return session

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        old_state = session.lifecycle_state
        session.selected_option_id = option_id
        session.approved_by = operator_id
        session.approval_timestamp = now_iso
        session.lifecycle_state = 'APPROVED'
        session.updated_at = now_iso
        self._log_state_transition(session_id, old_state, 'APPROVED', f"Người vận hành {operator_id} đã xác nhận phương án")

        # Automatically trigger dispatch
        self.dispatch_approved_resolution(session_id)
        return session

    def reject_option(
        self,
        session_id: str,
        reason: str = "Người vận hành từ chối can thiệp"
    ) -> TacticalResolutionSession:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Không tìm thấy phiên xử lý {session_id}")

        old_state = session.lifecycle_state
        session.lifecycle_state = 'REJECTED'
        session.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self._log_state_transition(session_id, old_state, 'REJECTED', reason)
        return session

    def dispatch_approved_resolution(self, session_id: str) -> TacticalResolutionSession:
        session = self.sessions.get(session_id)
        if not session or session.lifecycle_state != 'APPROVED':
            return session

        option = next((o for o in session.proposed_options if o.option_id == session.selected_option_id), None)
        if not option:
            session.lifecycle_state = 'FAILED'
            return session

        command_id = f"CMD-TAC-{uuid.uuid4().hex[:8].upper()}"
        session.command_id = command_id
        session.lifecycle_state = 'SENT'
        self._log_state_transition(session_id, 'APPROVED', 'SENT', f"Đã gửi lệnh {command_id} tới adapter")

        # Dispatch via adapter
        ack = self.adapter.dispatch_command(
            command_id=command_id,
            target_uav_id=option.target_uav_id,
            command_payload=option.adjustment.model_dump()
        )

        ack_status = ack.get('status')
        session.command_ack_status = ack_status

        if ack_status == 'ACCEPTED':
            session.lifecycle_state = 'ACCEPTED'
            self._log_state_transition(session_id, 'SENT', 'ACCEPTED', "Bộ mô phỏng đã nhận và chấp nhận lệnh")
            # Transition to EXECUTING
            session.lifecycle_state = 'EXECUTING'
            self._log_state_transition(session_id, 'ACCEPTED', 'EXECUTING', "UAV đang thực hiện cơ động né tránh")
        elif ack_status == 'REJECTED':
            session.lifecycle_state = 'FAILED'
            self._log_state_transition(session_id, 'SENT', 'FAILED', f"Bộ mô phỏng từ chối lệnh: {ack.get('details')}")
        else:
            session.lifecycle_state = 'TIMEOUT'
            self._log_state_transition(session_id, 'SENT', 'TIMEOUT', "Hết thời gian chờ phản hồi từ bộ mô phỏng")

        session.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return session

    def verify_resolution_with_new_telemetry(
        self,
        session_id: str,
        latest_uav_states: Dict[str, ObservedUAVStatePayload],
        min_horizontal_buffer_m: float = 50.0,
        min_vertical_buffer_m: float = 15.0
    ) -> TacticalResolutionSession:
        """
        CRITICAL VERIFICATION STEP:
        A resolution is ONLY marked 'VERIFIED' when newly observed telemetry proves that
        separation has been successfully restored beyond the safety threshold.
        """
        session = self.sessions.get(session_id)
        if not session or session.lifecycle_state not in ['EXECUTING', 'COMPLETED', 'ACCEPTED']:
            return session

        uav_a = latest_uav_states.get(session.conflict.uav_a_id)
        uav_b = latest_uav_states.get(session.conflict.uav_b_id)

        if not uav_a or not uav_b:
            session.verification_status = 'PENDING_TELEMETRY'
            return session

        t_cpa, h_dist, v_dist, _, _, _ = calculate_cpa(
            uav_a.position, uav_a.velocity,
            uav_b.position, uav_b.velocity,
            max_lookahead_seconds=60.0
        )

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if h_dist >= min_horizontal_buffer_m or v_dist >= min_vertical_buffer_m:
            session.lifecycle_state = 'VERIFIED'
            session.verification_status = 'CONFIRMED_SAFE'
            session.verification_details = (
                f"Đã xác minh qua telemetry mới: Phân cách 3D an toàn (CPA ngang={round(h_dist, 1)}m, "
                f"đứng={round(v_dist, 1)}m)"
            )
            self._log_state_transition(session_id, 'EXECUTING', 'VERIFIED', session.verification_details)
        else:
            session.verification_status = 'MANEUVER_IN_PROGRESS'
            session.verification_details = (
                f"Đang theo dõi: CPA hiện tại ngang={round(h_dist, 1)}m, đứng={round(v_dist, 1)}m"
            )

        session.updated_at = now_iso
        return session
