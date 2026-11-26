"""
Khối 2 — SQLite Telemetry & Session Store (Phước's Criteria 5, 6, 7, 8)
Automatically stores simulation sessions, MAVLink-to-Backend telemetry records,
and command execution logs into SQLite, supporting session history retrieval
and independent CSV/JSON export.
"""

from __future__ import annotations

import csv
import io
import json
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "khoi2_telemetry.sqlite3"


class Khoi2SQLiteStore:
    def __init__(self, db_path: Path = DEFAULT_DB_PATH) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init_schema()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._lock:
            conn = self._get_conn()
            try:
                conn.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS simulation_sessions (
                        session_id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        source_mode TEXT NOT NULL,
                        started_at TEXT NOT NULL,
                        ended_at TEXT,
                        uav_count INTEGER DEFAULT 0,
                        record_count INTEGER DEFAULT 0,
                        notes TEXT
                    );

                    CREATE TABLE IF NOT EXISTS telemetry_records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        sequence INTEGER NOT NULL,
                        uav_id TEXT NOT NULL,
                        callsign TEXT,
                        flight_plan_id TEXT,
                        sim_time_sec REAL NOT NULL,
                        recorded_at TEXT NOT NULL,
                        -- Raw PX4 MAVLink integer values (Criterion 2 & 8: PX4 vs Backend comparison)
                        mavlink_lat_int INTEGER NOT NULL,
                        mavlink_lon_int INTEGER NOT NULL,
                        mavlink_alt_mm INTEGER NOT NULL,
                        mavlink_rel_alt_mm INTEGER NOT NULL,
                        mavlink_vx_cms INTEGER NOT NULL,
                        mavlink_vy_cms INTEGER NOT NULL,
                        mavlink_vz_cms INTEGER NOT NULL,
                        mavlink_hdg_cdeg INTEGER NOT NULL,
                        -- Decoded Backend values
                        latitude REAL NOT NULL,
                        longitude REAL NOT NULL,
                        altitude_msl_m REAL NOT NULL,
                        relative_altitude_m REAL NOT NULL,
                        groundspeed_m_s REAL NOT NULL,
                        climb_rate_m_s REAL NOT NULL,
                        heading_deg REAL NOT NULL,
                        roll_deg REAL NOT NULL,
                        pitch_deg REAL NOT NULL,
                        yaw_deg REAL NOT NULL,
                        battery_percent REAL NOT NULL,
                        battery_voltage_v REAL NOT NULL,
                        flight_mode TEXT NOT NULL,
                        armed INTEGER NOT NULL,
                        landed_state TEXT NOT NULL,
                        raw_json TEXT NOT NULL
                    );

                    CREATE INDEX IF NOT EXISTS idx_telemetry_session
                        ON telemetry_records(session_id, id DESC);
                    CREATE INDEX IF NOT EXISTS idx_telemetry_uav
                        ON telemetry_records(session_id, uav_id, id DESC);

                    CREATE TABLE IF NOT EXISTS command_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        command_id TEXT NOT NULL,
                        uav_id TEXT NOT NULL,
                        command_type TEXT NOT NULL,
                        parameters_json TEXT NOT NULL,
                        status TEXT NOT NULL,
                        feedback_message TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                    """
                )
                conn.commit()
            finally:
                conn.close()

    def create_session(
        self,
        title: str = "Phiên mô phỏng PX4 SITL Đà Nẵng",
        source_mode: str = "PX4_SITL_6DOF_MAVLINK",
        notes: str = "Tự động lưu SQLite (Tiêu chí 5, 6, 7, 8)",
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        session_id = f"SIM-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{int(time.time() * 1000) % 1000:03d}"
        with self._lock:
            conn = self._get_conn()
            try:
                conn.execute(
                    """
                    INSERT INTO simulation_sessions
                        (session_id, title, source_mode, started_at, ended_at, uav_count, record_count, notes)
                    VALUES (?, ?, ?, ?, NULL, 0, 0, ?)
                    """,
                    (session_id, title, source_mode, now_iso, notes),
                )
                conn.commit()
            finally:
                conn.close()
        return {
            "session_id": session_id,
            "title": title,
            "source_mode": source_mode,
            "started_at": now_iso,
            "record_count": 0,
        }

    def insert_telemetry(self, session_id: str, packet: Dict[str, Any]) -> int:
        mav = packet.get("mavlink_raw", {})
        pos = packet.get("position", {})
        vel = packet.get("velocity", {})
        att = packet.get("attitude", {})
        bat = packet.get("battery", {})
        st = packet.get("status", {})
        recorded_at = packet.get("timestamps", {}).get("backend_timestamp") or (
            datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        )

        with self._lock:
            conn = self._get_conn()
            try:
                cur = conn.execute(
                    """
                    INSERT INTO telemetry_records (
                        session_id, sequence, uav_id, callsign, flight_plan_id,
                        sim_time_sec, recorded_at,
                        mavlink_lat_int, mavlink_lon_int, mavlink_alt_mm, mavlink_rel_alt_mm,
                        mavlink_vx_cms, mavlink_vy_cms, mavlink_vz_cms, mavlink_hdg_cdeg,
                        latitude, longitude, altitude_msl_m, relative_altitude_m,
                        groundspeed_m_s, climb_rate_m_s, heading_deg,
                        roll_deg, pitch_deg, yaw_deg,
                        battery_percent, battery_voltage_v,
                        flight_mode, armed, landed_state, raw_json
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?,
                        ?, ?, ?, ?
                    )
                    """,
                    (
                        session_id,
                        int(packet.get("sequence", 0)),
                        str(packet.get("uav_id", "uav-1")),
                        str(packet.get("callsign", "UAV-1")),
                        packet.get("flightPlanId"),
                        float(packet.get("simulationTimeSec", 0.0)),
                        recorded_at,
                        int(mav.get("lat_int", 0)),
                        int(mav.get("lon_int", 0)),
                        int(mav.get("alt_mm", 0)),
                        int(mav.get("relative_alt_mm", 0)),
                        int(mav.get("vx_cms", 0)),
                        int(mav.get("vy_cms", 0)),
                        int(mav.get("vz_cms", 0)),
                        int(mav.get("hdg_cdeg", 0)),
                        float(pos.get("latitude", 0.0)),
                        float(pos.get("longitude", 0.0)),
                        float(pos.get("altitude_msl_m", 0.0)),
                        float(pos.get("relative_altitude_m", 0.0)),
                        float(vel.get("groundspeed_m_s", 0.0)),
                        float(vel.get("climb_rate_m_s", 0.0)),
                        float(att.get("heading_deg", 0.0)),
                        float(att.get("roll_deg", 0.0)),
                        float(att.get("pitch_deg", 0.0)),
                        float(att.get("yaw_deg", 0.0)),
                        float(bat.get("remaining_percent", 100.0)),
                        float(bat.get("voltage_v", 24.0)),
                        str(st.get("flight_mode", "MISSION")),
                        1 if st.get("armed", True) else 0,
                        str(st.get("landed_state", "IN_AIR")),
                        json.dumps(packet, ensure_ascii=False),
                    ),
                )
                row_id = int(cur.lastrowid or 0)
                conn.execute(
                    """
                    UPDATE simulation_sessions
                    SET record_count = record_count + 1
                    WHERE session_id = ?
                    """,
                    (session_id,),
                )
                conn.commit()
                return row_id
            finally:
                conn.close()

    def log_command(
        self,
        session_id: str,
        command_id: str,
        uav_id: str,
        command_type: str,
        parameters: Dict[str, Any],
        status: str,
        feedback_message: str,
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        with self._lock:
            conn = self._get_conn()
            try:
                conn.execute(
                    """
                    INSERT INTO command_logs (
                        session_id, command_id, uav_id, command_type,
                        parameters_json, status, feedback_message, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        session_id,
                        command_id,
                        uav_id,
                        command_type,
                        json.dumps(parameters, ensure_ascii=False),
                        status,
                        feedback_message,
                        now_iso,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        return {
            "session_id": session_id,
            "command_id": command_id,
            "uav_id": uav_id,
            "command_type": command_type,
            "parameters": parameters,
            "status": status,
            "feedback_message": feedback_message,
            "created_at": now_iso,
        }

    def list_sessions(self) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._get_conn()
            try:
                rows = conn.execute(
                    """
                    SELECT s.*,
                           (SELECT COUNT(DISTINCT uav_id) FROM telemetry_records t WHERE t.session_id = s.session_id) AS distinct_uavs
                    FROM simulation_sessions s
                    ORDER BY s.started_at DESC
                    LIMIT 50
                    """
                ).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()

    def get_session_records(
        self,
        session_id: str,
        uav_id: Optional[str] = None,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._get_conn()
            try:
                if uav_id:
                    rows = conn.execute(
                        """
                        SELECT id, session_id, sequence, uav_id, callsign, flight_plan_id,
                               sim_time_sec, recorded_at,
                               mavlink_lat_int, mavlink_lon_int, mavlink_alt_mm, mavlink_rel_alt_mm,
                               mavlink_vx_cms, mavlink_vy_cms, mavlink_vz_cms, mavlink_hdg_cdeg,
                               latitude, longitude, altitude_msl_m, relative_altitude_m,
                               groundspeed_m_s, climb_rate_m_s, heading_deg,
                               roll_deg, pitch_deg, yaw_deg,
                               battery_percent, battery_voltage_v,
                               flight_mode, armed, landed_state
                        FROM telemetry_records
                        WHERE session_id = ? AND uav_id = ?
                        ORDER BY id DESC
                        LIMIT ?
                        """,
                        (session_id, uav_id, limit),
                    ).fetchall()
                else:
                    rows = conn.execute(
                        """
                        SELECT id, session_id, sequence, uav_id, callsign, flight_plan_id,
                               sim_time_sec, recorded_at,
                               mavlink_lat_int, mavlink_lon_int, mavlink_alt_mm, mavlink_rel_alt_mm,
                               mavlink_vx_cms, mavlink_vy_cms, mavlink_vz_cms, mavlink_hdg_cdeg,
                               latitude, longitude, altitude_msl_m, relative_altitude_m,
                               groundspeed_m_s, climb_rate_m_s, heading_deg,
                               roll_deg, pitch_deg, yaw_deg,
                               battery_percent, battery_voltage_v,
                               flight_mode, armed, landed_state
                        FROM telemetry_records
                        WHERE session_id = ?
                        ORDER BY id DESC
                        LIMIT ?
                        """,
                        (session_id, limit),
                    ).fetchall()
                return [dict(r) for r in reversed(rows)]
            finally:
                conn.close()

    def get_latest_record_by_uav(self, session_id: str) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            conn = self._get_conn()
            try:
                rows = conn.execute(
                    """
                    SELECT t.*
                    FROM telemetry_records t
                    INNER JOIN (
                        SELECT uav_id, MAX(id) AS max_id
                        FROM telemetry_records
                        WHERE session_id = ?
                        GROUP BY uav_id
                    ) latest ON t.id = latest.max_id
                    """,
                    (session_id,),
                ).fetchall()
                result: Dict[str, Dict[str, Any]] = {}
                for r in rows:
                    d = dict(r)
                    d.pop("raw_json", None)
                    result[str(d["uav_id"])] = d
                return result
            finally:
                conn.close()

    def get_command_logs(self, session_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._get_conn()
            try:
                if session_id:
                    rows = conn.execute(
                        """
                        SELECT * FROM command_logs
                        WHERE session_id = ?
                        ORDER BY id DESC
                        LIMIT ?
                        """,
                        (session_id, limit),
                    ).fetchall()
                else:
                    rows = conn.execute(
                        """
                        SELECT * FROM command_logs
                        ORDER BY id DESC
                        LIMIT ?
                        """,
                        (limit,),
                    ).fetchall()
                out: List[Dict[str, Any]] = []
                for r in rows:
                    item = dict(r)
                    try:
                        item["parameters"] = json.loads(item.pop("parameters_json", "{}"))
                    except Exception:
                        item["parameters"] = {}
                    out.append(item)
                return out
            finally:
                conn.close()

    def export_session_csv(self, session_id: str) -> str:
        records = self.get_session_records(session_id, limit=5000)
        output = io.StringIO()
        fieldnames = [
            "id",
            "session_id",
            "sequence",
            "uav_id",
            "callsign",
            "flight_plan_id",
            "sim_time_sec",
            "recorded_at",
            "mavlink_lat_int",
            "mavlink_lon_int",
            "mavlink_alt_mm",
            "mavlink_rel_alt_mm",
            "mavlink_vx_cms",
            "mavlink_vy_cms",
            "mavlink_vz_cms",
            "mavlink_hdg_cdeg",
            "latitude",
            "longitude",
            "altitude_msl_m",
            "relative_altitude_m",
            "groundspeed_m_s",
            "climb_rate_m_s",
            "heading_deg",
            "roll_deg",
            "pitch_deg",
            "yaw_deg",
            "battery_percent",
            "battery_voltage_v",
            "flight_mode",
            "armed",
            "landed_state",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            writer.writerow({k: rec.get(k) for k in fieldnames})
        return output.getvalue()
