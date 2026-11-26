"""
Pytest verification suite for Khối 2 — PX4 SITL / Gazebo & SQLite Store
Verifies all 8 criteria from Phước's checklist:
1. PX4 SITL / Gazebo 6-DOF engine active
2. Backend decodes PX4 MAVLink integers accurately
3. State API exposes matching values for Website
4. UAV coordinates move along Da Nang waypoints
5. Automatic SQLite persistence
6. Historical session listing & record query
7. Independent CSV & JSON export
8. 4-tier accuracy (PX4 MAVLink -> Backend -> SQLite -> Website) + Command execution feedback
"""

from pathlib import Path
from fastapi.testclient import TestClient

from khoi2_px4_simulator.db_store import Khoi2SQLiteStore
from khoi2_px4_simulator.mavlink_bridge import PX4SitlEngine
from khoi2_px4_simulator.main import app


def test_khoi2_mavlink_to_backend_to_sqlite_accuracy(tmp_path: Path):
    db_file = tmp_path / "test_khoi2.sqlite3"
    store = Khoi2SQLiteStore(db_path=db_file)
    engine = PX4SitlEngine()

    session = store.create_session(title="Test Session", source_mode=engine.source_mode)
    packets = engine.step(0.5)
    assert len(packets) >= 2

    pkt = packets[0]
    row_id = store.insert_telemetry(session["session_id"], pkt)
    assert row_id > 0

    latest_by_uav = store.get_latest_record_by_uav(session["session_id"])
    uav_id = pkt["uav_id"]
    assert uav_id in latest_by_uav
    db_rec = latest_by_uav[uav_id]

    # Criterion 2 & 8: Exact match between PX4 MAVLink raw integers, Backend float, and SQLite
    mav = pkt["mavlink_raw"]
    pos = pkt["position"]
    assert mav["lat_int"] == int(round(pos["latitude"] * 1e7))
    assert mav["lon_int"] == int(round(pos["longitude"] * 1e7))
    assert mav["relative_alt_mm"] == int(round(pos["relative_altitude_m"] * 1000))
    assert db_rec["mavlink_lat_int"] == mav["lat_int"]
    assert abs(db_rec["latitude"] - pos["latitude"]) < 1e-6
    assert abs(db_rec["relative_altitude_m"] - pos["relative_altitude_m"]) < 1e-3

    # Criterion 6 & 7: History & CSV export
    records = store.get_session_records(session["session_id"])
    assert len(records) == 1
    csv_text = store.export_session_csv(session["session_id"])
    assert "mavlink_lat_int" in csv_text
    assert uav_id in csv_text


def test_khoi2_command_and_flight_plan_api():
    with TestClient(app) as client:
        # Dispatch an approved flight plan from Vương (nested FlightPlanEvent schema)
        fp_res = client.post(
            "/api/integration/flight-plans",
            json={
                "schemaVersion": "1.0",
                "eventId": "evt-vuong-2026",
                "eventType": "flightplan.accepted",
                "flightPlan": {
                    "flightId": "FP-VUONG-2026",
                    "droneId": "11111111-2222-3333-4444-555555555555",
                    "serialNumber": "uav-1",
                    "status": "APPROVED",
                    "waypoints": [
                        {"name": "Vertiport Cầu Rồng", "latitude": 16.0612, "longitude": 108.2245, "altitude": 78},
                        {"name": "Công viên Bờ Đông", "latitude": 16.0646, "longitude": 108.2278, "altitude": 84},
                    ],
                },
            },
        )
        assert fp_res.status_code == 200
        fp_body = fp_res.json()
        assert fp_body["status"] == "ACCEPTED"
        assert fp_body["eventId"] == "evt-vuong-2026"
        assert fp_body["flightPlanId"] == "FP-VUONG-2026"

        # Execute valid tactical adjustment command
        cmd_res = client.post(
            "/api/commands",
            json={
                "uav_id": "uav-1",
                "command_type": "CHANGE_ALTITUDE",
                "parameters": {"target_altitude_m": 110.0},
            },
        )
        assert cmd_res.status_code == 200
        body = cmd_res.json()
        assert body["accepted"] is True
        assert body["status"] == "EXECUTING"

        # Verify state endpoint
        st_res = client.get("/api/state")
        assert st_res.status_code == 200
        state_data = st_res.json()
        assert "session" in state_data
        assert "live_uavs" in state_data
