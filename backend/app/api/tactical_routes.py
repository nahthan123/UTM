"""
TASK 11 & TASK 12: FASTAPI TACTICAL ROUTER
REST Endpoints and WebSocket connection for tactical conflict detection,
resolution selection, approval workflow, and report downloads.
"""

from fastapi import APIRouter, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import json
from backend.app.models.schemas import (
    TacticalFeedInput,
    ConflictDetectionResult,
    TacticalResolutionSession,
    ConflictIncidentReport
)
from backend.app.services.conflict_detection.detector import ConflictDetector
from backend.app.services.resolution.generator import ResolutionGenerator
from backend.app.services.execution.state_machine import TacticalStateMachine
from backend.app.services.execution.mock_adapter import MockExecutionAdapter
from backend.app.services.reporting.report_generator import IncidentReportGenerator

router = APIRouter(prefix="/api/tactical", tags=["tactical"])

# Singletons for tactical processing
detector = ConflictDetector()
generator = ResolutionGenerator()
mock_adapter = MockExecutionAdapter()
state_machine = TacticalStateMachine(execution_adapter=mock_adapter)

# WebSocket connection manager
class TacticalConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

ws_manager = TacticalConnectionManager()

@router.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "UTM Tactical Deconfliction Engine (Task 11 / Part 5)",
        "version": "1.0.0",
        "capabilities": {
            "max_concurrent_uavs": 50,
            "algorithms": ["3D_CPA", "KINEMATIC_PROJECTION", "MULTI_CONSTRAINT_VALIDATOR", "TIER_B_AI_RANKER"],
            "supported_uav_types": ["MULTIROTOR", "FIXED_WING", "VTOL"]
        }
    }

@router.post("/reset")
def reset_state():
    state_machine.sessions.clear()
    state_machine.history_logs.clear()
    return {"status": "RESET_SUCCESS"}

@router.post("/feed")
async def ingest_feed(feed: TacticalFeedInput, use_ai: bool = Query(True)):
    """
    Ingests official verified observed state feed from Task 10 (Part5ExportBridge).
    Runs conflict detection and generates candidate resolutions.
    """
    conflicts = detector.detect_conflicts(feed.active_uav_states, feed.restricted_zones)
    active_sessions: List[TacticalResolutionSession] = []

    for conflict in conflicts:
        session_id = f"SES-{conflict.conflict_id}"
        existing_session = state_machine.sessions.get(session_id)

        if not existing_session:
            options = generator.generate_options(
                conflict=conflict,
                uav_states=feed.active_uav_states,
                restricted_zones=feed.restricted_zones,
                use_ai=use_ai
            )
            session = state_machine.create_session(conflict, options)
            active_sessions.append(session)
        else:
            # Check for post-execution verification with new telemetry
            if existing_session.lifecycle_state in ['EXECUTING', 'ACCEPTED']:
                state_machine.verify_resolution_with_new_telemetry(session_id, feed.active_uav_states)
            active_sessions.append(existing_session)

    # Broadcast update to connected WebSockets
    payload = {
        "type": "tactical.feed.update",
        "conflicts": [c.model_dump() for c in conflicts],
        "sessions": [s.model_dump() for s in active_sessions]
    }
    await ws_manager.broadcast(payload)

    return {
        "status": "PROCESSED",
        "conflict_count": len(conflicts),
        "conflicts": conflicts,
        "sessions": active_sessions
    }

@router.get("/conflicts")
def get_conflicts():
    return {
        "sessions": list(state_machine.sessions.values())
    }

@router.post("/sessions/{session_id}/approve")
async def approve_resolution(
    session_id: str,
    option_id: str = Query(...),
    operator_id: str = Query("OPERATOR-DANANG-UTM")
):
    try:
        session = state_machine.approve_option(session_id, option_id, operator_id)
        # Broadcast state change
        await ws_manager.broadcast({
            "type": "tactical.session.approved",
            "session": session.model_dump()
        })
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/reject")
async def reject_resolution(session_id: str, reason: str = Query("Từ chối bởi người vận hành")):
    try:
        session = state_machine.reject_option(session_id, reason)
        await ws_manager.broadcast({
            "type": "tactical.session.rejected",
            "session": session.model_dump()
        })
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports/{session_id}/json")
def get_report_json(session_id: str):
    session = state_machine.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên xử lý")

    history = state_machine.history_logs.get(session_id, [])
    report = IncidentReportGenerator.generate_report_object(session, history)
    json_str = IncidentReportGenerator.export_to_json_str(report)

    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=tactical_report_{session_id}.json"}
    )

@router.get("/reports/{session_id}/csv")
def get_report_csv(session_id: str):
    session = state_machine.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên xử lý")

    history = state_machine.history_logs.get(session_id, [])
    report = IncidentReportGenerator.generate_report_object(session, history)
    csv_str = IncidentReportGenerator.export_to_csv_str(report)

    return Response(
        content=csv_str,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=tactical_report_{session_id}.csv"}
    )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial state on connect
        await websocket.send_json({
            "type": "tactical.connection.ready",
            "sessions": [s.model_dump() for s in state_machine.sessions.values()]
        })
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / command if needed
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
