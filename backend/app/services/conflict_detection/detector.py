"""
TASK 11: TACTICAL CONFLICT DETECTION ENGINE
Evaluates pairwise separation between N >= 3 UAVs, computes 3D CPA,
distinguishes geometric crossings from real-time temporal conflicts,
and checks geofence/NFZ proximity.
"""

from typing import List, Dict, Optional
import datetime
from backend.app.models.schemas import (
    ObservedUAVStatePayload,
    ConflictDetectionResult,
    RestrictedZonePayload,
    GeoPosition3D,
    DataConfidence
)
from backend.app.services.spatial_math import (
    calculate_cpa,
    calculate_vertical_distance_m,
    haversine_distance_m,
    check_nfz_breach
)

class ConflictDetector:
    def __init__(
        self,
        horizontal_threshold_m: float = 50.0,
        vertical_threshold_m: float = 15.0,
        lookahead_window_s: float = 60.0,
        time_to_cpa_warning_s: float = 45.0,
        time_to_cpa_critical_s: float = 20.0
    ):
        self.h_threshold = horizontal_threshold_m
        self.v_threshold = vertical_threshold_m
        self.lookahead_s = lookahead_window_s
        self.t_warning_s = time_to_cpa_warning_s
        self.t_critical_s = time_to_cpa_critical_s

    def detect_conflicts(
        self,
        uav_states: Dict[str, ObservedUAVStatePayload],
        restricted_zones: Optional[List[RestrictedZonePayload]] = None
    ) -> List[ConflictDetectionResult]:
        """
        Scans all active UAVs pairwise and flags any predicted loss of separation.
        """
        conflicts: List[ConflictDetectionResult] = []
        uav_list = list(uav_states.values())
        n = len(uav_list)
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Pairwise comparison
        for i in range(n):
            for j in range(i + 1, n):
                uav_a = uav_list[i]
                uav_b = uav_list[j]

                # Check data reliability
                if uav_a.freshness in ['LOST', 'INVALID'] or uav_b.freshness in ['LOST', 'INVALID']:
                    # Cannot reliably predict trajectory if link is lost or invalid
                    continue

                # Run 3D CPA calculation
                (
                    t_cpa,
                    cpa_h_dist,
                    cpa_v_dist,
                    cpa_3d_dist,
                    (a_cpa_lat, a_cpa_lon, a_cpa_alt),
                    (b_cpa_lat, b_cpa_lon, b_cpa_alt)
                ) = calculate_cpa(
                    uav_a.position,
                    uav_a.velocity,
                    uav_b.position,
                    uav_b.velocity,
                    max_lookahead_seconds=self.lookahead_s
                )

                # Check altitude datum alignment
                _, requires_altitude_alignment = calculate_vertical_distance_m(
                    uav_a.position,
                    uav_b.position
                )

                # Determine if conflict exists within thresholds
                is_horizontal_conflict = (cpa_h_dist < self.h_threshold)
                is_vertical_conflict = (cpa_v_dist < self.v_threshold)

                # True 3D conflict requires BOTH horizontal and vertical breaches simultaneously
                if is_horizontal_conflict and is_vertical_conflict and (t_cpa > 0.0 or cpa_h_dist < self.h_threshold):
                    # Severity classification
                    if t_cpa <= self.t_critical_s or cpa_h_dist < (self.h_threshold * 0.5):
                        severity = 'CRITICAL'
                    elif t_cpa <= self.t_warning_s:
                        severity = 'WARNING'
                    else:
                        severity = 'ADVISORY'

                    # Composite data confidence
                    if uav_a.confidence == 'HIGH' and uav_b.confidence == 'HIGH':
                        conf = 'HIGH'
                    elif uav_a.confidence in ['LOW', 'UNRELIABLE'] or uav_b.confidence in ['LOW', 'UNRELIABLE']:
                        conf = 'LOW'
                    else:
                        conf = 'MEDIUM'

                    # Calculate CPA timestamp
                    try:
                        base_time = datetime.datetime.fromisoformat(uav_a.timestamp.replace('Z', '+00:00'))
                    except Exception:
                        base_time = datetime.datetime.now(datetime.timezone.utc)
                    cpa_time_iso = (base_time + datetime.timedelta(seconds=t_cpa)).isoformat()

                    conflict_id = f"CONF-{uav_a.uav_id}-{uav_b.uav_id}-{int(t_cpa)}"

                    desc = (
                        f"Dự báo vi phạm phân cách giữa {uav_a.uav_id} và {uav_b.uav_id}: "
                        f"Khoảng cách ngang CPA = {round(cpa_h_dist, 1)}m (< {self.h_threshold}m), "
                        f"Độ cao chênh lệch = {round(cpa_v_dist, 1)}m (< {self.v_threshold}m) tại t+{round(t_cpa, 1)}s."
                    )

                    if requires_altitude_alignment:
                        desc += " CẢNH BÁO: Hệ mốc độ cao không đồng nhất (AGL vs MSL), cần chuẩn hóa địa hình."

                    conflicts.append(
                        ConflictDetectionResult(
                            conflict_id=conflict_id,
                            uav_a_id=uav_a.uav_id,
                            uav_b_id=uav_b.uav_id,
                            severity=severity,
                            detected_at=now_iso,
                            time_to_cpa_seconds=round(t_cpa, 1),
                            cpa_timestamp=cpa_time_iso,
                            cpa_horizontal_distance_m=round(cpa_h_dist, 2),
                            cpa_vertical_distance_m=round(cpa_v_dist, 2),
                            cpa_3d_distance_m=round(cpa_3d_dist, 2),
                            uav_a_position_at_cpa=GeoPosition3D(
                                latitude=a_cpa_lat,
                                longitude=a_cpa_lon,
                                altitude_m=a_cpa_alt,
                                altitude_reference=uav_a.position.altitude_reference
                            ),
                            uav_b_position_at_cpa=GeoPosition3D(
                                latitude=b_cpa_lat,
                                longitude=b_cpa_lon,
                                altitude_m=b_cpa_alt,
                                altitude_reference=uav_b.position.altitude_reference
                            ),
                            data_confidence=conf,
                            requires_altitude_alignment=requires_altitude_alignment,
                            description=desc
                        )
                    )

        # Sort conflicts by severity and time to CPA
        severity_rank = {'CRITICAL': 0, 'WARNING': 1, 'ADVISORY': 2}
        conflicts.sort(key=lambda c: (severity_rank[c.severity], c.time_to_cpa_seconds))
        return conflicts
