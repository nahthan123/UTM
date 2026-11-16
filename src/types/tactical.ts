/**
 * TASK 11 & TASK 12: TACTICAL DECONFLICTION DATA CONTRACT
 * Frontend TypeScript types matching Part 5 FastAPI schemas.
 */

import { GeoPosition3D, UAVFlightStatus } from './telemetry';
import { DataConfidence } from './monitoring';

export type ConflictSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY';

export interface ConflictDetectionResult {
  conflict_id: string;
  uav_a_id: string;
  uav_b_id: string;
  severity: ConflictSeverity;
  detected_at: string;
  time_to_cpa_seconds: number;
  cpa_timestamp: string;
  cpa_horizontal_distance_m: number;
  cpa_vertical_distance_m: number;
  cpa_3d_distance_m: number;
  uav_a_position_at_cpa: GeoPosition3D;
  uav_b_position_at_cpa: GeoPosition3D;
  data_confidence: DataConfidence;
  requires_altitude_alignment: boolean;
  description: string;
}

export interface ResolutionAdjustment {
  action_type: 'ALTITUDE_CHANGE' | 'SPEED_CHANGE' | 'HEADING_CHANGE' | 'COMPOUND';
  target_altitude_m?: number;
  target_ground_speed_mps?: number;
  target_heading_deg?: number;
  altitude_delta_m?: number;
  speed_delta_mps?: number;
  heading_delta_deg?: number;
}

export interface ProjectedTrajectoryPoint {
  time_offset_s: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
}

export interface ConstraintCheckResult {
  resolves_primary_conflict: boolean;
  causes_secondary_conflict: boolean;
  breaches_restricted_zone: boolean;
  within_performance_envelope: boolean;
  within_plan_deviation_budget: boolean;
  data_freshness_adequate: boolean;
  is_feasible: boolean;
  rejection_reasons: string[];
}

export interface ResolutionOption {
  option_id: string;
  conflict_id: string;
  target_uav_id: string;
  uav_type: string;
  adjustment: ResolutionAdjustment;
  projected_trajectory: ProjectedTrajectoryPoint[];
  constraint_check: ConstraintCheckResult;
  plan_deviation_score: number;
  risk_reduction_score: number;
  ai_confidence_score?: number;
  composite_rank_score: number;
  selection_rationale: string;
  status: 'FEASIBLE' | 'REJECTED_CONSTRAINT' | 'NO_FEASIBLE_SOLUTION';
}

export type TacticalResolutionLifecycle =
  | 'DETECTED'
  | 'ANALYZING'
  | 'PROPOSED'
  | 'VALIDATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'ACCEPTED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'INVALID'
  | 'TIMEOUT'
  | 'FAILED'
  | 'NO_FEASIBLE_SOLUTION';

export interface TacticalResolutionSession {
  session_id: string;
  conflict: ConflictDetectionResult;
  lifecycle_state: TacticalResolutionLifecycle;
  proposed_options: ResolutionOption[];
  selected_option_id?: string;
  approved_by?: string;
  approval_timestamp?: string;
  command_id?: string;
  command_ack_status?: string;
  verification_status?: string;
  verification_details?: string;
  created_at: string;
  updated_at: string;
}

export interface ConflictIncidentReport {
  report_id: string;
  conflict_id: string;
  uav_ids: string[];
  detected_at: string;
  resolved_at?: string;
  cpa_projected_m: number;
  actual_min_observed_distance_m?: number;
  lifecycle_history: Array<{
    timestamp: string;
    from_state: string;
    to_state: string;
    details: string;
  }>;
  chosen_resolution?: any;
  constraint_audit?: any;
  final_outcome: string;
  operator_notes?: string;
  generated_at: string;
}
