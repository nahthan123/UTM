"""
TASK 11: RESOLUTION CONSTRAINT VALIDATOR
Performs independent, strict validation on any proposed resolution against 7 mandatory safety checks:
1. Primary conflict resolution (separation >= threshold)
2. No secondary conflict with other active UAVs (N >= 3)
3. No Restricted Zone / NFZ penetration
4. Adherence to specific UAV performance envelope (Multirotor vs Fixed-Wing vs VTOL)
5. Adherence to mission plan deviation limits
6. Data freshness and confidence check
7. Comprehensive feasibility determination
"""

from typing import List, Dict, Optional
from backend.app.models.schemas import (
    ObservedUAVStatePayload,
    ResolutionAdjustment,
    ProjectedTrajectoryPoint,
    ConstraintCheckResult,
    RestrictedZonePayload,
    GeoPosition3D,
    VelocityVector3D
)
from backend.app.services.trajectory_prediction.predictor import TrajectoryPredictor
from backend.app.services.spatial_math import (
    calculate_cpa,
    check_nfz_breach,
    haversine_distance_m
)

class ResolutionValidator:
    def __init__(
        self,
        min_horizontal_separation_m: float = 50.0,
        min_vertical_separation_m: float = 15.0
    ):
        self.min_h_sep = min_horizontal_separation_m
        self.min_v_sep = min_vertical_separation_m

    def validate_resolution(
        self,
        target_uav: ObservedUAVStatePayload,
        other_uav_states: Dict[str, ObservedUAVStatePayload],
        primary_conflicting_uav_id: str,
        adjustment: ResolutionAdjustment,
        projected_trajectory: List[ProjectedTrajectoryPoint],
        restricted_zones: Optional[List[RestrictedZonePayload]] = None
    ) -> ConstraintCheckResult:
        rejection_reasons: List[str] = []
        limits = TrajectoryPredictor.get_limits(target_uav)

        # 1. Data Freshness Check
        freshness_ok = target_uav.freshness in ['FRESH', 'DEGRADED']
        if not freshness_ok:
            rejection_reasons.append(
                f"Dữ liệu UAV {target_uav.uav_id} không đủ độ tin cậy (Trạng thái: {target_uav.freshness})"
            )

        # 2. Performance Envelope Check
        perf_ok = True
        if adjustment.target_ground_speed_mps is not None:
            if adjustment.target_ground_speed_mps > limits.max_ground_speed_mps:
                perf_ok = False
                rejection_reasons.append(
                    f"Vận tốc đề xuất {adjustment.target_ground_speed_mps} m/s vượt quá giới hạn tối đa {limits.max_ground_speed_mps} m/s của {limits.uav_type}"
                )
            if adjustment.target_ground_speed_mps < limits.min_ground_speed_mps:
                perf_ok = False
                rejection_reasons.append(
                    f"Vận tốc đề xuất {adjustment.target_ground_speed_mps} m/s thấp hơn vận tốc tối thiểu (stall speed) {limits.min_ground_speed_mps} m/s của {limits.uav_type}"
                )

        if adjustment.altitude_delta_m is not None:
            # Check climb / descent feasibility over duration
            climb_time_s = 10.0  # typical tactical maneuver window
            rate = abs(adjustment.altitude_delta_m) / climb_time_s
            if adjustment.altitude_delta_m > 0 and rate > limits.max_climb_rate_mps:
                perf_ok = False
                rejection_reasons.append(
                    f"Tốc độ leo cao {round(rate, 1)} m/s vượt quá khả năng tối đa {limits.max_climb_rate_mps} m/s của {limits.uav_type}"
                )
            elif adjustment.altitude_delta_m < 0 and rate > limits.max_descent_rate_mps:
                perf_ok = False
                rejection_reasons.append(
                    f"Tốc độ hạ cao {round(rate, 1)} m/s vượt quá khả năng tối đa {limits.max_descent_rate_mps} m/s của {limits.uav_type}"
                )

        if adjustment.heading_delta_deg is not None:
            turn_mag = abs(adjustment.heading_delta_deg)
            turn_time_s = 2.0
            turn_rate = turn_mag / turn_time_s
            if turn_rate > limits.max_turn_rate_deg_s:
                perf_ok = False
                rejection_reasons.append(
                    f"Tốc độ quay vòng {round(turn_rate, 1)} deg/s vượt ngưỡng tối đa {limits.max_turn_rate_deg_s} deg/s của {limits.uav_type}"
                )

        # 3. Restricted Zone (NFZ) Check along trajectory
        nfz_breached = False
        if restricted_zones and projected_trajectory:
            for pt in projected_trajectory:
                breach = check_nfz_breach(pt.latitude, pt.longitude, pt.altitude_m, restricted_zones)
                if breach:
                    nfz_breached = True
                    rejection_reasons.append(
                        f"Quỹ đạo đề xuất xâm phạm vùng hạn chế '{breach.name}' ({breach.zone_id}) tại độ cao {pt.altitude_m}m"
                    )
                    break

        # Construct adjusted target state for CPA testing
        test_pos = GeoPosition3D(
            latitude=target_uav.position.latitude,
            longitude=target_uav.position.longitude,
            altitude_m=(
                adjustment.target_altitude_m
                if adjustment.target_altitude_m is not None
                else target_uav.position.altitude_m
            ),
            altitude_reference=target_uav.position.altitude_reference
        )
        test_vel = VelocityVector3D(
            ground_speed_mps=(
                adjustment.target_ground_speed_mps
                if adjustment.target_ground_speed_mps is not None
                else target_uav.velocity.ground_speed_mps
            ),
            heading_deg=(
                adjustment.target_heading_deg
                if adjustment.target_heading_deg is not None
                else target_uav.velocity.heading_deg
            ),
            vertical_speed_mps=target_uav.velocity.vertical_speed_mps
        )

        # 4. Check primary conflict resolution
        resolves_primary = False
        primary_uav = other_uav_states.get(primary_conflicting_uav_id)
        if primary_uav:
            t_cpa, h_dist, v_dist, _, _, _ = calculate_cpa(
                test_pos, test_vel, primary_uav.position, primary_uav.velocity, max_lookahead_seconds=60.0
            )
            # Both horizontal OR vertical must satisfy minimum buffer
            if h_dist >= self.min_h_sep or v_dist >= self.min_v_sep:
                resolves_primary = True
            else:
                rejection_reasons.append(
                    f"Phương án chưa giải quyết được xung đột: Khoảng cách CPA vẫn vi phạm (Ngang: {round(h_dist, 1)}m, Đứng: {round(v_dist, 1)}m)"
                )
        else:
            resolves_primary = True

        # 5. Check for secondary conflict with ANY other UAV in airspace (N >= 3 check)
        causes_secondary = False
        for uav_id, other_uav in other_uav_states.items():
            if uav_id == target_uav.uav_id or uav_id == primary_conflicting_uav_id:
                continue

            t_cpa, h_dist, v_dist, _, _, _ = calculate_cpa(
                test_pos, test_vel, other_uav.position, other_uav.velocity, max_lookahead_seconds=60.0
            )
            if h_dist < self.min_h_sep and v_dist < self.min_v_sep:
                causes_secondary = True
                rejection_reasons.append(
                    f"Phương án gây xung đột thứ cấp mới với UAV {uav_id} (CPA ngang: {round(h_dist, 1)}m, đứng: {round(v_dist, 1)}m)"
                )
                break

        # 6. Plan Deviation Budget Check
        within_budget = True
        if adjustment.altitude_delta_m and abs(adjustment.altitude_delta_m) > 100.0:
            within_budget = False
            rejection_reasons.append("Độ lệch cao độ vượt quá ngân sách nhiệm vụ (+/- 100m)")

        # Overall feasibility
        is_feasible = (
            freshness_ok and
            perf_ok and
            (not nfz_breached) and
            resolves_primary and
            (not causes_secondary) and
            within_budget
        )

        return ConstraintCheckResult(
            resolves_primary_conflict=resolves_primary,
            causes_secondary_conflict=causes_secondary,
            breaches_restricted_zone=nfz_breached,
            within_performance_envelope=perf_ok,
            within_plan_deviation_budget=within_budget,
            data_freshness_adequate=freshness_ok,
            is_feasible=is_feasible,
            rejection_reasons=rejection_reasons
        )
