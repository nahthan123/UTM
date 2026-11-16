"""
TASK 11: TACTICAL RESOLUTION GENERATOR
Generates kinematic candidate maneuvers (Altitude, Speed, Heading, Compound)
for resolving detected conflicts, subjects each candidate to strict constraint checks,
and ranks them via AI or Baseline.
"""

from typing import List, Dict, Optional
import datetime
from backend.app.models.schemas import (
    ObservedUAVStatePayload,
    ConflictDetectionResult,
    ResolutionOption,
    ResolutionAdjustment,
    RestrictedZonePayload,
    ProjectedTrajectoryPoint,
    UAVType
)
from backend.app.services.resolution.validator import ResolutionValidator
from backend.app.services.resolution.ai_ranker import TacticalAIRanker
from backend.app.services.spatial_math import (
    local_enu_to_geo,
    velocity_to_enu_mps
)

class ResolutionGenerator:
    def __init__(self):
        self.validator = ResolutionValidator()

    def _generate_trajectory_for_adjustment(
        self,
        uav: ObservedUAVStatePayload,
        adj: ResolutionAdjustment,
        duration_s: float = 60.0,
        step_s: float = 2.0
    ) -> List[ProjectedTrajectoryPoint]:
        trajectory: List[ProjectedTrajectoryPoint] = []
        try:
            base_time = datetime.datetime.fromisoformat(uav.timestamp.replace('Z', '+00:00'))
        except Exception:
            base_time = datetime.datetime.now(datetime.timezone.utc)

        ref_lat = uav.position.latitude
        ref_lon = uav.position.longitude
        start_alt = uav.position.altitude_m
        target_alt = adj.target_altitude_m if adj.target_altitude_m is not None else start_alt

        target_speed = (
            adj.target_ground_speed_mps
            if adj.target_ground_speed_mps is not None
            else uav.velocity.ground_speed_mps
        )
        target_hdg = (
            adj.target_heading_deg
            if adj.target_heading_deg is not None
            else uav.velocity.heading_deg
        )

        vx, vy = velocity_to_enu_mps(target_speed, target_hdg)

        # Smooth altitude transition over 8 seconds
        maneuver_time_s = 8.0
        current_step = 0.0

        while current_step <= duration_s:
            dx = vx * current_step
            dy = vy * current_step
            curr_lat, curr_lon = local_enu_to_geo(ref_lat, ref_lon, dx, dy)

            if current_step <= maneuver_time_s:
                ratio = current_step / maneuver_time_s
                curr_alt = start_alt + (target_alt - start_alt) * ratio
            else:
                curr_alt = target_alt

            pt_time = base_time + datetime.timedelta(seconds=current_step)
            trajectory.append(
                ProjectedTrajectoryPoint(
                    time_offset_s=current_step,
                    timestamp=pt_time.isoformat(),
                    latitude=curr_lat,
                    longitude=curr_lon,
                    altitude_m=round(curr_alt, 2)
                )
            )
            current_step += step_s

        return trajectory

    def generate_options(
        self,
        conflict: ConflictDetectionResult,
        uav_states: Dict[str, ObservedUAVStatePayload],
        restricted_zones: Optional[List[RestrictedZonePayload]] = None,
        use_ai: bool = True
    ) -> List[ResolutionOption]:
        """
        Generates candidate deconfliction maneuvers for the UAVs involved in the conflict.
        """
        uav_a = uav_states.get(conflict.uav_a_id)
        uav_b = uav_states.get(conflict.uav_b_id)

        if not uav_a or not uav_b:
            return []

        # Target selection: prioritize multirotor for vertical/hover flexibility
        target_uavs = [uav_a, uav_b]
        if uav_a.uav_type == 'MULTIROTOR' and uav_b.uav_type == 'FIXED_WING':
            target_uavs = [uav_a]
        elif uav_b.uav_type == 'MULTIROTOR' and uav_a.uav_type == 'FIXED_WING':
            target_uavs = [uav_b]

        raw_options: List[ResolutionOption] = []
        opt_idx = 1

        for target in target_uavs:
            other_id = conflict.uav_b_id if target.uav_id == conflict.uav_a_id else conflict.uav_a_id
            curr_alt = target.position.altitude_m
            curr_speed = target.velocity.ground_speed_mps
            curr_hdg = target.velocity.heading_deg

            # Candidate maneuver parameter sets
            candidate_adjustments: List[ResolutionAdjustment] = [
                # 1. Altitude Climb (+25m)
                ResolutionAdjustment(
                    action_type='ALTITUDE_CHANGE',
                    target_altitude_m=curr_alt + 25.0,
                    altitude_delta_m=+25.0
                ),
                # 2. Altitude Climb (+40m)
                ResolutionAdjustment(
                    action_type='ALTITUDE_CHANGE',
                    target_altitude_m=curr_alt + 40.0,
                    altitude_delta_m=+40.0
                ),
                # 3. Altitude Descent (-25m if above 40m safe floor)
                ResolutionAdjustment(
                    action_type='ALTITUDE_CHANGE',
                    target_altitude_m=max(20.0, curr_alt - 25.0),
                    altitude_delta_m=-25.0
                ) if curr_alt > 45.0 else None,
                # 4. Speed Reduction (-5 m/s)
                ResolutionAdjustment(
                    action_type='SPEED_CHANGE',
                    target_ground_speed_mps=max(0.0, curr_speed - 5.0),
                    speed_delta_mps=-5.0
                ),
                # 5. Speed Increase (+5 m/s)
                ResolutionAdjustment(
                    action_type='SPEED_CHANGE',
                    target_ground_speed_mps=curr_speed + 5.0,
                    speed_delta_mps=+5.0
                ),
                # 6. Heading Right (+30 deg)
                ResolutionAdjustment(
                    action_type='HEADING_CHANGE',
                    target_heading_deg=(curr_hdg + 30.0) % 360.0,
                    heading_delta_deg=+30.0
                ),
                # 7. Heading Left (-30 deg)
                ResolutionAdjustment(
                    action_type='HEADING_CHANGE',
                    target_heading_deg=(curr_hdg - 30.0 + 360.0) % 360.0,
                    heading_delta_deg=-30.0
                ),
                # 8. Compound (Climb +20m and Speed -3 m/s)
                ResolutionAdjustment(
                    action_type='COMPOUND',
                    target_altitude_m=curr_alt + 20.0,
                    altitude_delta_m=+20.0,
                    target_ground_speed_mps=max(0.0, curr_speed - 3.0),
                    speed_delta_mps=-3.0
                )
            ]

            for adj in candidate_adjustments:
                if not adj:
                    continue

                trajectory = self._generate_trajectory_for_adjustment(target, adj)
                check_result = self.validator.validate_resolution(
                    target_uav=target,
                    other_uav_states=uav_states,
                    primary_conflicting_uav_id=other_id,
                    adjustment=adj,
                    projected_trajectory=trajectory,
                    restricted_zones=restricted_zones
                )

                # Estimated risk reduction (if feasible, risk reduced by 85%-98%)
                risk_red = 0.90 if check_result.is_feasible else 0.10

                opt = ResolutionOption(
                    option_id=f"OPT-{conflict.conflict_id}-{opt_idx:02d}",
                    conflict_id=conflict.conflict_id,
                    target_uav_id=target.uav_id,
                    uav_type=target.uav_type,
                    adjustment=adj,
                    projected_trajectory=trajectory,
                    constraint_check=check_result,
                    plan_deviation_score=0.15,
                    risk_reduction_score=risk_red,
                    composite_rank_score=0.0,
                    selection_rationale="",
                    status='FEASIBLE' if check_result.is_feasible else 'REJECTED_CONSTRAINT'
                )
                raw_options.append(opt)
                opt_idx += 1

        # Rank using AI or Baseline
        ranked = TacticalAIRanker.rank_options(raw_options, use_ai=use_ai)

        # Check if ANY option is feasible
        has_feasible = any(o.constraint_check.is_feasible for o in ranked)
        if not has_feasible:
            # Explicitly return NO_FEASIBLE_SOLUTION option
            no_sol = ResolutionOption(
                option_id=f"OPT-{conflict.conflict_id}-NO-SOLUTION",
                conflict_id=conflict.conflict_id,
                target_uav_id=conflict.uav_a_id,
                uav_type=uav_a.uav_type,
                adjustment=ResolutionAdjustment(action_type='ALTITUDE_CHANGE'),
                projected_trajectory=[],
                constraint_check=self.validator.validate_resolution(
                    uav_a, uav_states, conflict.uav_b_id,
                    ResolutionAdjustment(action_type='ALTITUDE_CHANGE'), []
                ),
                plan_deviation_score=1.0,
                risk_reduction_score=0.0,
                composite_rank_score=0.0,
                selection_rationale="CẢNH BÁO: Không tìm thấy phương án né tránh khả thi thỏa mãn toàn bộ ràng buộc an toàn! Duy trì cảnh báo khẩn cấp.",
                status='NO_FEASIBLE_SOLUTION'
            )
            return [no_sol]

        return ranked
