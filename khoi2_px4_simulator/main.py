"""
Khối 2 — Mô phỏng PX4 SITL / Gazebo & Sinh dữ liệu Telemetry (Port 8001)
Full replacement for Phước's Khối 2 module:
- Streams 10Hz telemetry via WebSocket (ws://localhost:8001/ws/telemetry) to Khối 4 Web 3D (:3000)
- Receives approved flight plans from Vương's Khối 1 (:8080) via POST /api/integration/flight-plans
- Receives valid UAV adjustment commands via POST /api/commands and returns execution feedback
- Automatically stores telemetry into SQLite (1Hz sample or on-demand) for Criteria 5, 6, 7, 8
- Serves interactive 2D Map + 8-Criteria Verification Dashboard at GET / (http://localhost:8001)
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import urllib.request
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

from .db_store import Khoi2SQLiteStore
from .mavlink_bridge import PX4SitlEngine

DASHBOARD_HTML_PATH = Path(__file__).resolve().parent / "dashboard.html"
DANANG_CITY_JS_PATH = Path(__file__).resolve().parent / "danang_city_3d.js"

store = Khoi2SQLiteStore()
engine = PX4SitlEngine()
active_session = store.create_session(
    title="Phiên mô phỏng PX4 SITL & Gazebo Đà Nẵng (Live)",
    source_mode=engine.source_mode,
    notes="Tự động lưu SQLite - Kết nối Khối 1 (:8080) và Khối 4 (:3000)",
)

connected_ws_clients: Set[WebSocket] = set()
latest_packets_by_uav: Dict[str, Dict[str, Any]] = {}
_bg_task: Optional[asyncio.Task] = None
_sync_task: Optional[asyncio.Task] = None
VUONG_REGISTERED_UAVS_URL = os.environ.get(
    "VUONG_REGISTERED_UAVS_URL",
    "http://127.0.0.1:8080/api/integration/registered-uavs",
)


class CommandRequest(BaseModel):
    uav_id: str = Field(default="uav-1", description="Mã UAV nhận lệnh (vd: uav-1, uav-2)")
    command_type: str = Field(
        ...,
        description="Loại lệnh: CHANGE_ALTITUDE | CHANGE_SPEED | CHANGE_HEADING | HOLD_POSITION | RESUME_MISSION | RTL",
    )
    parameters: Dict[str, Any] = Field(default_factory=dict)


async def _simulation_loop() -> None:
    """
    10Hz simulation clock (dt = 0.1s).
    Broadcasts every frame to connected WebSocket clients (/ws/telemetry)
    and auto-saves into SQLite every 1.0s (every 10th frame per UAV) so SQLite stays fast and clean.
    """
    global latest_packets_by_uav
    tick = 0
    while True:
        tick += 1
        packets = engine.step(0.1)
        for pkt in packets:
            uav_id = str(pkt["uav_id"])
            latest_packets_by_uav[uav_id] = pkt
            # Auto-save to SQLite every 10 ticks (1Hz per UAV) -> Criterion 5
            if tick % 10 == 1:
                store.insert_telemetry(active_session["session_id"], pkt)

        if connected_ws_clients:
            dead_clients: List[WebSocket] = []
            for ws in list(connected_ws_clients):
                try:
                    for pkt in packets:
                        await ws.send_text(json.dumps(pkt, ensure_ascii=False))
                except Exception:
                    dead_clients.append(ws)
            for ws in dead_clients:
                connected_ws_clients.discard(ws)

        await asyncio.sleep(0.1)


async def _sync_uavs_from_vuong() -> List[str]:
    def _fetch() -> Any:
        with urllib.request.urlopen(VUONG_REGISTERED_UAVS_URL, timeout=2.0) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        payload = await asyncio.to_thread(_fetch)
        if isinstance(payload, list):
            return engine.sync_registered_uavs(payload)
    except Exception:
        pass
    return []


async def _vuong_sync_loop() -> None:
    await asyncio.sleep(1.0)
    while True:
        await _sync_uavs_from_vuong()
        await asyncio.sleep(5.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _bg_task, _sync_task
    _bg_task = asyncio.create_task(_simulation_loop())
    _sync_task = asyncio.create_task(_vuong_sync_loop())
    try:
        yield
    finally:
        if _bg_task:
            _bg_task.cancel()
        if _sync_task:
            _sync_task.cancel()


app = FastAPI(
    title="Khối 2 — Mô phỏng PX4 SITL / Gazebo & Sinh dữ liệu Telemetry",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def get_dashboard() -> HTMLResponse:
    if DASHBOARD_HTML_PATH.exists():
        return HTMLResponse(DASHBOARD_HTML_PATH.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>Khối 2 PX4 SITL Server Running</h1>")


@app.get("/danang_city_3d.js")
async def get_danang_city_js() -> Response:
    if DANANG_CITY_JS_PATH.exists():
        return Response(
            content=DANANG_CITY_JS_PATH.read_text(encoding="utf-8"),
            media_type="application/javascript; charset=utf-8",
        )
    raise HTTPException(status_code=404, detail="danang_city_3d.js not found")


@app.get("/api/state")
async def get_live_state() -> Dict[str, Any]:
    """
    Returns live PX4 MAVLink raw data, Backend decoded telemetry, and latest SQLite record
    side-by-side so the Website can verify Criteria 1 -> 8 in real time.
    """
    session_id = active_session["session_id"]
    db_latest = store.get_latest_record_by_uav(session_id)
    sessions = store.list_sessions()
    current_session_meta = next((s for s in sessions if s["session_id"] == session_id), active_session)

    routes: Dict[str, List[Dict[str, Any]]] = {}
    trails: Dict[str, List[List[float]]] = {}
    for uid, uav in engine.uavs.items():
        routes[uid] = [
            {
                "index": wp.index,
                "name": wp.name,
                "latitude": wp.latitude,
                "longitude": wp.longitude,
                "altitude_m": wp.altitude_m,
            }
            for wp in uav.waypoints
        ]
        trails[uid] = [[pt[0], pt[1], pt[2]] for pt in uav.trail[-60:]]

    return {
        "session": current_session_meta,
        "ws_client_count": len(connected_ws_clients),
        "environment": {
            "gazebo_world": engine.gazebo_world,
            "engine_mode": engine.source_mode,
            "wind_speed_mps": engine.wind_speed_mps,
            "wind_direction_deg": engine.wind_direction_deg,
            "temperature_c": engine.temperature_c,
        },
        "live_uavs": latest_packets_by_uav,
        "sqlite_latest_by_uav": db_latest,
        "routes": routes,
        "trails": trails,
        "recent_commands": store.get_command_logs(session_id=session_id, limit=15),
    }


@app.post("/api/sessions/new")
async def start_new_session(title: Optional[str] = None) -> Dict[str, Any]:
    global active_session
    session_title = title or f"Phiên PX4 SITL Đà Nẵng ({time.strftime('%H:%M:%S')})"
    active_session = store.create_session(
        title=session_title,
        source_mode=engine.source_mode,
        notes="Phiên mô phỏng tạo mới từ giao diện Khối 2",
    )
    return {"status": "CREATED", "session": active_session}


@app.get("/api/sessions")
async def list_sessions() -> Dict[str, Any]:
    return {
        "active_session_id": active_session["session_id"],
        "sessions": store.list_sessions(),
    }


@app.get("/api/sessions/{session_id}/records")
async def get_session_history(
    session_id: str,
    uav_id: Optional[str] = Query(default=None),
    limit: int = Query(default=300, ge=1, le=5000),
) -> Dict[str, Any]:
    records = store.get_session_records(session_id=session_id, uav_id=uav_id, limit=limit)
    return {
        "session_id": session_id,
        "uav_id": uav_id,
        "count": len(records),
        "records": records,
    }


@app.get("/api/sessions/{session_id}/export.csv")
async def export_session_csv(session_id: str) -> PlainTextResponse:
    csv_text = store.export_session_csv(session_id)
    headers = {
        "Content-Disposition": f'attachment; filename="khoi2_telemetry_{session_id}.csv"',
    }
    return PlainTextResponse(content=csv_text, media_type="text/csv; charset=utf-8", headers=headers)


@app.get("/api/sessions/{session_id}/export.json")
async def export_session_json(session_id: str) -> JSONResponse:
    records = store.get_session_records(session_id=session_id, limit=5000)
    payload = {
        "exported_from": "Khối 2 — Mô phỏng PX4 SITL / Gazebo & SQLite Store",
        "session_id": session_id,
        "record_count": len(records),
        "records": records,
    }
    headers = {
        "Content-Disposition": f'attachment; filename="khoi2_telemetry_{session_id}.json"',
    }
    return JSONResponse(content=payload, headers=headers)


@app.post("/api/commands")
async def post_control_command(req: CommandRequest) -> Dict[str, Any]:
    """
    Receives valid control adjustment commands and returns execution feedback
    (Phước's Excel requirement: 'tiếp nhận lệnh điều chỉnh hợp lệ và phản hồi trạng thái thực thi').
    """
    cmd_id = f"CMD-{uuid.uuid4().hex[:8].upper()}"
    ok, status_code, feedback = engine.execute_command(
        uav_id=req.uav_id,
        command_type=req.command_type,
        parameters=req.parameters,
    )
    logged = store.log_command(
        session_id=active_session["session_id"],
        command_id=cmd_id,
        uav_id=req.uav_id,
        command_type=req.command_type.upper(),
        parameters=req.parameters,
        status=status_code,
        feedback_message=str(feedback.get("message", "")),
    )
    if not ok:
        raise HTTPException(status_code=400, detail={"command": logged, "feedback": feedback})
    return {
        "accepted": True,
        "command_id": cmd_id,
        "status": status_code,
        "feedback": feedback,
        "logged": logged,
    }


@app.post("/api/sync-vuong")
async def trigger_sync_from_vuong() -> Dict[str, Any]:
    """Triggers immediate sync of registered drones & active plans from Vương (Khối 1 :8080)."""
    synced = await _sync_uavs_from_vuong()
    return {"synced": synced, "total_uavs": list(engine.uavs.keys())}


@app.post("/api/integration/flight-plans")
async def receive_approved_flight_plan(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Receives an approved Flight Plan from Vương (Khối 1 :8080) and spawns/updates
    the simulated UAV in PX4 SITL so Khối 2 flies the exact route approved by Khối 1.
    Returns HTTP 200 with status="ACCEPTED" and matching eventId per MonitoringHttpClient contract.
    """
    result = engine.register_flight_plan(payload)
    result["status"] = "ACCEPTED"
    if payload.get("eventId") is not None:
        result["eventId"] = str(payload.get("eventId"))
    event_type = str(payload.get("eventType") or "FLIGHTPLAN").strip().upper()
    store.log_command(
        session_id=active_session["session_id"],
        command_id=f"FP-{uuid.uuid4().hex[:6].upper()}",
        uav_id=result["uav_id"],
        command_type=f"UTM_OPS_{event_type}",
        parameters={
            "flightPlanId": result["flightPlanId"],
            "eventId": result.get("eventId", ""),
            "waypoint_count": result["waypoint_count"],
        },
        status="ACCEPTED",
        feedback_message=f"Đã nhận {event_type} cho kế hoạch {result['flightPlanId']} ({result['uav_id']}, {result['waypoint_count']} waypoints)",
    )
    return result


@app.websocket("/ws/telemetry")
async def ws_telemetry_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    connected_ws_clients.add(websocket)
    try:
        # Immediately push latest snapshot upon connection
        for pkt in latest_packets_by_uav.values():
            await websocket.send_text(json.dumps(pkt, ensure_ascii=False))
        while True:
            # Listen for optional client pings or inline JSON commands
            msg_text = await websocket.receive_text()
            try:
                data = json.loads(msg_text)
                if isinstance(data, dict) and data.get("command_type"):
                    engine.execute_command(
                        uav_id=str(data.get("uav_id", "uav-1")),
                        command_type=str(data["command_type"]),
                        parameters=data.get("parameters") or {},
                    )
            except Exception:
                pass
    except WebSocketDisconnect:
        connected_ws_clients.discard(websocket)
    except Exception:
        connected_ws_clients.discard(websocket)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run("khoi2_px4_simulator.main:app", host="0.0.0.0", port=port, reload=False)
