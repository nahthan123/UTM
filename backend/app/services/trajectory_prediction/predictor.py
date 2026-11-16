"""
TASK 11: TRAJECTORY PREDICTION MODULE
Projects future 3D trajectories using kinematic models bounded by realistic performance profiles
for MULTIROTOR, FIXED_WING, and VTOL.
"""

from typing import List, Dict
import datetime
from backend.app.models.schemas import (
    ObservedUAVStatePayload,
    ProjectedTrajectoryPoint,
    UAVPerformanceLimits,
    UAVType
)
from backend.app.services.spatial_math import (
    geo_to_local_enu_m,
    local_enu_to_geo,
    velocity_to_enu_mps
)

# Standardized UAV performance profiles matching Part 4 data/mockScenarios.ts
STANDARD_PERFORMANCE_LIMITS: Dict[UAVType, UAVPerformanceLimits] = {
    'MULTIROTOR': UAVPerformanceLimits(
        uav_type='MULTIROTOR',
        max_ground_speed_mps=23.0,
        min_ground_speed_mps=0.0,
        max_climb_rate_mps=6.0,
        max_descent_rate_mps=5.0,
        max_turn_rate_deg_s=90.0,
        mtow_kg=9.2
    ),
    'FIXED_WING': UAVPerformanceLimits(
        uav_type='FIXED_WING',
        max_ground_speed_mps=34.0,
        min_ground_speed_mps=12.0,  # Stall speed threshold
        max_climb_rate_mps=8.0,
        max_descent_rate_mps=6.0,
        max_turn_rate_deg_s=35.0,
        mtow_kg=18.5
    ),
    'VTOL': UAVPerformanceLimits(
        uav_type='VTOL',
        max_ground_speed_mps=30.0,
        min_ground_speed_mps=0.0,
        max_climb_rate_mps=6.5,
        max_descent_rate_mps=5.5,
        max_turn_rate_deg_s=45.0,
        mtow_kg=15.0
    )
}

class TrajectoryPredictor:
    @staticmethod
    def get_limits(uav: ObservedUAVStatePayload) -> UAVPerformanceLimits:
        return STANDARD_PERFORMANCE_LIMITS.get(uav.uav_type, STANDARD_PERFORMANCE_LIMITS['MULTIROTOR'])

    @staticmethod
    def predict_linear_trajectory(
        uav: ObservedUAVStatePayload,
        lookahead_seconds: float = 60.0,
        step_seconds: float = 2.0
    ) -> List[ProjectedTrajectoryPoint]:
        """
        Projects a dead-reckoning trajectory point-by-point, taking into account
        verified physical velocity and timestamp.
        """
        trajectory: List[ProjectedTrajectoryPoint] = []
        
        try:
            base_time = datetime.datetime.fromisoformat(uav.timestamp.replace('Z', '+00:00'))
        except Exception:
            base_time = datetime.datetime.now(datetime.timezone.utc)

        ref_lat = uav.position.latitude
        ref_lon = uav.position.longitude
        alt_m = uav.position.altitude_m

        vx, vy = velocity_to_enu_mps(uav.velocity.ground_speed_mps, uav.velocity.heading_deg)
        vz = uav.velocity.vertical_speed_mps if uav.velocity.vertical_speed_mps is not None else 0.0

        current_step = 0.0
        while current_step <= lookahead_seconds:
            # ENU displacement
            dx = vx * current_step
            dy = vy * current_step
            curr_lat, curr_lon = local_enu_to_geo(ref_lat, ref_lon, dx, dy)
            curr_alt = max(0.0, alt_m + vz * current_step)

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
            current_step += step_seconds

        return trajectory
