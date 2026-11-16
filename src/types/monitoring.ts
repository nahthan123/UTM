/**
 * UTM MONITORING SYSTEM - OBSERVED STATE & PART 5 AI INTEGRATION CONTRACT
 * This module defines the verified, clean state exported to downstream tactical deconfliction engines.
 */

import { GeoPosition3D, VelocityVector3D, UAVFlightStatus, MonitoringAlert, UAVPerformanceProfile } from './telemetry';

export type FreshnessStatus = 'FRESH' | 'DEGRADED' | 'STALE' | 'LOST' | 'INVALID';

export type DataConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRELIABLE';

/**
 * Metric indicators of link and message health
 */
export interface DataQuality {
  freshness: FreshnessStatus;
  confidence: DataConfidence;
  
  // Timing references
  sim_time_utc: string;               // Virtual simulation clock from message
  message_created_at_utc: string;     // Wall-clock when message was generated at source
  received_at_wall_clock_utc: string; // Wall-clock when Part 4 ingested the message
  freshness_age_ms: number;           // Elapsed ms since message arrived at Part 4
  latency_ms: number;                 // Transmission delay: received_at - message_created_at

  // Sequence & packet metrics
  last_sequence: number;
  sequence_gap_count: number;         // Detected dropped packets
  out_of_order_count: number;         // Packets arrived out of sequence
  is_stale: boolean;                  // True if freshness_age_ms > staleThreshold
  is_lost: boolean;                   // True if no packet received > lostThreshold
  is_invalid: boolean;                // True if payload failed range/sanity checks
}

/**
 * 4D Plan comparison metrics (Spatial + Temporal Corridors)
 */
export interface FlightPlanDeviation {
  cross_track_error_m: number;   // Horizontal deviation from nearest corridor segment (m)
  vertical_deviation_m: number;  // Altitude delta from planned segment (m)
  time_deviation_s: number;      // Actual ETA vs Planned 4D Waypoint Time (+ delayed, - early)
  within_spatial_corridor: boolean; // Within horizontal & vertical safety buffer
  within_time_corridor: boolean;    // Within temporal window (+/- seconds)
  within_corridor: boolean;         // Both spatial and temporal conform
  current_segment_index: number;
}

/**
 * Official Observed State for an individual UAV tracked in 3D Space
 * CRITICAL NOTE: 'position' and 'velocity' represent the last verified physical telemetry
 * observation received from Part 2. 'display_position' is strictly for visual frame
 * interpolation and MUST NOT be used as official UTM state or fed to Part 5.
 */
export interface ObservedUAVState {
  uav_id: string;
  flight_plan_id?: string;
  is_unlinked_plan?: boolean;         // True if message has no flight_plan_id
  callsign?: string;
  status: UAVFlightStatus;
  flight_mode?: string;               // Flight mode from simulator (e.g. AUTONOMOUS_UTM_CONTROL)
  battery_pct?: number;
  uav_profile?: UAVPerformanceProfile;
  
  // Real verified physical observation (from latest valid telemetry)
  position: GeoPosition3D;
  velocity: VelocityVector3D;
  timestamp: string;                  // ISO 8601 from telemetry
  
  // Display interpolation helper (smooth 3D rendering only, NOT physical truth)
  display_position?: GeoPosition3D;
  display_heading_deg?: number;
  
  // Quality and 4D Deviation metrics
  data_quality: DataQuality;
  plan_deviation?: FlightPlanDeviation;
  
  // Protocol & provenance tracking
  data_source_format?: 'INTERNAL_V1' | 'PHUOC_ASTM_F3411' | 'TEST_IMPORT';
  is_inferred_sequence?: boolean;
  data_field_summary?: {
    received: string[];
    missing: string[];
    inferred: string[];
  };

  // Trail history (bounded buffer to prevent memory leakage)
  trail: Array<{
    latitude: number;
    longitude: number;
    altitude_m: number;
    timestamp: string;
  }>;
}

/**
 * Clean data package exported for Part 5 Tactical AI Deconfliction
 */
export interface Part5InputFeed {
  feed_timestamp: string;
  active_uav_states: Record<string, ObservedUAVState>;
  airspace_alerts: MonitoringAlert[];
  system_integrity: {
    total_uavs: number;
    high_confidence_count: number;
    degraded_count: number;
    stale_count: number;
    invalid_count: number;
  };
}

/**
 * Monitoring Event dispatched when anomalies occur
 */
export interface MonitoringEvent {
  event_type: 
    | 'UAV_ENTER_CORRIDOR' 
    | 'UAV_EXIT_CORRIDOR' 
    | 'UAV_4D_SCHEDULE_DELAY'
    | 'STALE_LINK' 
    | 'RESTORED_LINK' 
    | 'DROP_PACKET' 
    | 'GEOFENCE_APPROACH';
  uav_id: string;
  timestamp: string;
  details: string;
}
