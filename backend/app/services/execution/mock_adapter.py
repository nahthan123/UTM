"""
TASK 11 & TASK 12: EXECUTION ADAPTERS
Defines ITacticalExecutionAdapter interface, MockExecutionAdapter for isolated testing,
and LiveExecutionAdapter for production dispatch to Part 2 / Phuoc Simulator.
All mock outputs are explicitly marked as MOCK/SIMULATED.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import datetime
import uuid

class ITacticalExecutionAdapter(ABC):
    @abstractmethod
    def dispatch_command(
        self,
        command_id: str,
        target_uav_id: str,
        command_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Dispatches tactical avoidance maneuver to flight simulator / control station."""
        pass

    @abstractmethod
    def poll_command_status(self, command_id: str) -> Dict[str, Any]:
        """Polls execution progress from simulator."""
        pass

class MockExecutionAdapter(ITacticalExecutionAdapter):
    """
    Mock adapter for testing the command-and-acknowledgment feedback loop
    without mutating Part 10 internal telemetry or relying on external simulator availability.
    """
    def __init__(self, should_succeed: bool = True, latency_seconds: float = 0.5):
        self.should_succeed = should_succeed
        self.latency_s = latency_seconds
        self.command_store: Dict[str, Dict[str, Any]] = {}

    def dispatch_command(
        self,
        command_id: str,
        target_uav_id: str,
        command_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        if not self.should_succeed:
            record = {
                'command_id': command_id,
                'target_uav_id': target_uav_id,
                'status': 'REJECTED',
                'error_code': 'SIMULATOR_REJECTED_MANEUVER',
                'details': 'Bộ mô phỏng từ chối lệnh do vi phạm quy tắc bay của kịch bản (MOCK TEST)',
                'is_mock': True,
                'timestamp': now_iso
            }
            self.command_store[command_id] = record
            return record

        record = {
            'command_id': command_id,
            'target_uav_id': target_uav_id,
            'status': 'ACCEPTED',
            'estimated_duration_s': 12.0,
            'is_mock': True,
            'simulated_start_time': now_iso,
            'timestamp': now_iso
        }
        self.command_store[command_id] = record
        return record

    def poll_command_status(self, command_id: str) -> Dict[str, Any]:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record = self.command_store.get(command_id)
        if not record:
            return {
                'command_id': command_id,
                'status': 'UNKNOWN',
                'is_mock': True,
                'timestamp': now_iso
            }

        # Transition to EXECUTING or COMPLETED based on timestamp
        return {
            **record,
            'status': 'COMPLETED',
            'progress_pct': 100,
            'updated_at': now_iso
        }

class LiveExecutionAdapter(ITacticalExecutionAdapter):
    """
    Live adapter interface reserved for real integration with Phuoc (Part 2) WebSocket/REST API.
    """
    def __init__(self, endpoint_url: str):
        self.endpoint_url = endpoint_url

    def dispatch_command(
        self,
        command_id: str,
        target_uav_id: str,
        command_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Ready to send HTTP POST / WS frame to Part 2 API when endpoint is live
        return {
            'command_id': command_id,
            'status': 'PENDING_PART2_LIVE_API',
            'is_mock': False,
            'endpoint': self.endpoint_url,
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    def poll_command_status(self, command_id: str) -> Dict[str, Any]:
        return {
            'command_id': command_id,
            'status': 'PENDING_PART2_LIVE_API',
            'is_mock': False
        }
