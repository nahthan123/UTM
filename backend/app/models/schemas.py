"""
TASK 11 & TASK 12: DATA SCHEMAS FOR TACTICAL DECONFLICTION
Standardized Pydantic schemas representing observed UAV state, tactical conflicts,
candidate resolutions, execution lifecycle, and reports.
"""

from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field

# Supported UAV Types
UAVType = Literal['MULTIROTOR', 'FIXED_WING', 'VTOL']
FreshnessStatus = Literal['FRESH', 'DEGRADED', 'STALE', 'LOST', 'INVALID']
DataConfidence = Literal['HIGH', 'MEDIUM', 'LOW', 'UNRELIABLE']
AltitudeReference = Literal['AGL', 'MSL', 'WGS84_ELLIPSOID']

class GeoPosition3D(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Degrees latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Degrees longitude")
    altitude_m: float = Field(..., description="Altitude in meters")
    altitude_reference: AltitudeReference = Field('AGL', description="Altitude reference datum")

class VelocityVector3D(BaseModel):
    ground_speed_mps: float = Field(..., ge=0.0, description="Horizontal ground speed (m/s)")
    heading_deg: float = Field(..., ge=0.0, le=360.0, description="Heading in degrees from true North")
    vertical_speed_mps: Optional[float] = Field(None, description="Climb/Descent rate in m/s (None if unmeasured)")

class UAVPerformanceLimits(BaseModel):
    uav_type: UAVType
    max_ground_speed_mps: float = 23.0
    min_ground_speed_mps: float = 0.0  # 0 for multirotor/vtol hover; >0 for fixed-wing
    max_climb_rate_mps: float = 6.0
    max_descent_rate_mps: float = 5.0
    max_turn_rate_deg_s: float = 90.0
    mtow_kg: float = 9.2

class ObservedUAVStatePayload(BaseModel):
    uav_id: str = Field(..., alias="uav_id")
    flight_plan_id: Optional[str] = None
    is_unlinked_plan: Optional[bool] = False
    callsign: Optional[str] = None
    status: str = 'ACTIVE'
    flight_mode: Optional[str] = None
    battery_pct: Optional[float] = None
    position: GeoPosition3D
    velocity: VelocityVector3D
    timestamp: str
    freshness: FreshnessStatus = 'FRESH'
    confidence: DataConfidence = 'HIGH'
    uav_type: UAVType = 'MULTIROTOR'
    uav_profile: Optional[Dict[str, Any]] = None

    model_config = {"populate_by_name": True}

class RestrictedZonePayload(BaseModel):
    zone_id: str
    name: str
    type: Literal['NO_FLY_ZONE', 'RESTRICTED_ALTITUDE', 'AIRPORT_BUFFER', 'WEATHER_HAZARD']
    min_altitude_m: float
    max_altitude_m: float
    polygon: List[List[float]]  # [[lon, lat], ...]

class TacticalFeedInput(BaseModel):
    feed_timestamp: str
    active_uav_states: Dict[str, ObservedUAVStatePayload]
    restricted_zones: Optional[List[RestrictedZonePayload]] = []
    simulation_speed: Optional[float] = 1.0

# Conflict Model
class ConflictDetectionResult(BaseModel):
    conflict_id: str
    uav_a_id: str
    uav_b_id: str
    severity: Literal['CRITICAL', 'WARNING', 'ADVISORY']
    detected_at: str
    time_to_cpa_seconds: float
    cpa_timestamp: str
    cpa_horizontal_distance_m: float
    cpa_vertical_distance_m: float
    cpa_3d_distance_m: float
    uav_a_position_at_cpa: GeoPosition3D
    uav_b_position_at_cpa: GeoPosition3D
    data_confidence: DataConfidence
    requires_altitude_alignment: bool = False
    description: str

class ResolutionAdjustment(BaseModel):
    action_type: Literal['ALTITUDE_CHANGE', 'SPEED_CHANGE', 'HEADING_CHANGE', 'COMPOUND']
    target_altitude_m: Optional[float] = None
    target_ground_speed_mps: Optional[float] = None
    target_heading_deg: Optional[float] = None
    altitude_delta_m: Optional[float] = None
    speed_delta_mps: Optional[float] = None
    heading_delta_deg: Optional[float] = None

class ProjectedTrajectoryPoint(BaseModel):
    time_offset_s: float
    timestamp: str
    latitude: float
    longitude: float
    altitude_m: float

class ConstraintCheckResult(BaseModel):
    resolves_primary_conflict: bool
    causes_secondary_conflict: bool
    breaches_restricted_zone: bool
    within_performance_envelope: bool
    within_plan_deviation_budget: bool
    data_freshness_adequate: bool
    is_feasible: bool
    rejection_reasons: List[str] = []

class ResolutionOption(BaseModel):
    option_id: str
    conflict_id: str
    target_uav_id: str
    uav_type: UAVType
    adjustment: ResolutionAdjustment
    projected_trajectory: List[ProjectedTrajectoryPoint]
    constraint_check: ConstraintCheckResult
    plan_deviation_score: float  # 0.0 to 1.0 (lower deviation = better)
    risk_reduction_score: float  # 0.0 to 1.0
    ai_confidence_score: Optional[float] = None
    composite_rank_score: float
    selection_rationale: str
    status: Literal['FEASIBLE', 'REJECTED_CONSTRAINT', 'NO_FEASIBLE_SOLUTION']

TacticalResolutionLifecycle = Literal[
    'DETECTED',
    'ANALYZING',
    'PROPOSED',
    'VALIDATED',
    'PENDING_APPROVAL',
    'APPROVED',
    'SENT',
    'ACCEPTED',
    'EXECUTING',
    'COMPLETED',
    'VERIFIED',
    'REJECTED',
    'INVALID',
    'TIMEOUT',
    'FAILED',
    'NO_FEASIBLE_SOLUTION'
]

class TacticalResolutionSession(BaseModel):
    session_id: str
    conflict: ConflictDetectionResult
    lifecycle_state: TacticalResolutionLifecycle
    proposed_options: List[ResolutionOption]
    selected_option_id: Optional[str] = None
    approved_by: Optional[str] = None
    approval_timestamp: Optional[str] = None
    command_id: Optional[str] = None
    command_ack_status: Optional[str] = None
    verification_status: Optional[str] = None
    verification_details: Optional[str] = None
    created_at: str
    updated_at: str

class ConflictIncidentReport(BaseModel):
    report_id: str
    conflict_id: str
    uav_ids: List[str]
    detected_at: str
    resolved_at: Optional[str] = None
    cpa_projected_m: float
    actual_min_observed_distance_m: Optional[float] = None
    lifecycle_history: List[Dict[str, Any]]
    chosen_resolution: Optional[Dict[str, Any]] = None
    constraint_audit: Optional[Dict[str, Any]] = None
    final_outcome: str
    operator_notes: Optional[str] = None
    generated_at: str
