/**
 * PHUOC TELEMETRY ADAPTER (PART 2 SIMULATOR INTEGRATION)
 * Converts ASTM F3411 / Phuoc Simulator payloads to internal UTM Monitoring contracts.
 * 
 * STRICT PRINCIPLES:
 * 1. Do NOT convert AGL to MSL arbitrarily. Keep altitude_reference = 'AGL'.
 * 2. Do NOT treat internal receive sequence as source sequence.
 * 3. Clearly segregate received, inferred, and missing fields.
 * 4. Missing flight_plan_id means unlinked flight plan (do NOT fake deviation checks).
 * 5. Missing vertical_speed_mps is kept undefined (do NOT assume 0).
 */

import {
  UAVTelemetryMessage,
  UAVType,
  UAVPerformanceProfile,
  EnvironmentState,
  RestrictedZone,
  IngestibleMessage,
} from '../../types/telemetry';
import { DANANG_ENU_ORIGIN, enuToWgs84 } from '../../utils/coordinates';

export interface PhuocRawUavTelemetry {
  messageType?: string;
  sequence?: number;
  flightPlanId?: string;
  timestamp?: string;
  simulationTimeSec?: number;
  uav_id?: string;
  id?: string;
  x?: number;
  y?: number;
  z?: number;
  headingDeg?: number;
  speed_mps?: number;
  localPosition?: {
    x?: number;
    y?: number;
    z?: number;
  };
  uav?: {
    id?: string;
    callsign?: string;
    type?: string;
    position?: {
      longitude?: number;
      latitude?: number;
      altitudeAGL_m?: number;
      altitudeMSL_m?: number;
      x?: number;
      y?: number;
      z?: number;
    };
    movement?: {
      airSpeed_mps?: number;
      groundSpeed_mps?: number;
      headingDeg?: number;
      driftAngleDeg?: number;
      verticalSpeed_mps?: number;
    };
    system?: {
      batteryPercent?: number;
      flightMode?: string;
    };
  };
}

export interface PhuocFieldAnalysis {
  receivedFields: string[];
  inferredFields: string[];
  missingFields: string[];
  telemetry?: UAVTelemetryMessage;
  errors: string[];
}

export class PhuocTelemetryAdapter {
  // Internal receive sequence tracker per UAV (does NOT reflect packet drop from Phuoc)
  private static receiveSequenceMap: Map<string, number> = new Map();

  /**
   * Resets internal receive sequence tracker (useful for testing or session reset)
   */
  public static resetSequences(): void {
    this.receiveSequenceMap.clear();
  }

  /**
   * Identifies whether the raw payload matches external simulator (ASTM F3411 / Gazebo) telemetry structure
   */
  public static isPhuocTelemetry(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;

    // Matches messageType "UAV_TELEMETRY" or has uav object with position
    if (obj.messageType === 'UAV_TELEMETRY') return true;
    if (obj.uav && typeof obj.uav === 'object') {
      const uav = obj.uav as Record<string, unknown>;
      if (uav.position || uav.id) return true;
    }
    // Flat Gazebo / local-metric telemetry packet
    if (
      (typeof obj.uav_id === 'string' || typeof obj.id === 'string') &&
      ((typeof obj.x === 'number' && typeof obj.y === 'number') ||
        (obj.localPosition && typeof obj.localPosition === 'object'))
    ) {
      return true;
    }
    return false;
  }

  /**
   * Identifies whether raw payload is an Environment or Airspace restriction message
   */
  public static isPhuocEnvironment(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    return (
      obj.messageType === 'ENVIRONMENT_STATE' ||
      obj.messageType === 'ENVIRONMENT_STATUS' ||
      obj.messageType === 'AIRSPACE_RESTRICTIONS' ||
      Boolean(obj.environment || obj.weather || obj.restrictedZones)
    );
  }

  /**
   * Comprehensive analysis of Phuoc telemetry message, segregating received, inferred, and missing fields.
   */
  public static analyzeAndAdapt(raw: unknown): PhuocFieldAnalysis {
    const received: string[] = [];
    const inferred: string[] = [];
    const missing: string[] = [];
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return {
        receivedFields: [],
        inferredFields: [],
        missingFields: ['payload_object'],
        errors: ['Bản tin không phải là JSON object hợp lệ'],
      };
    }

    const p = raw as PhuocRawUavTelemetry;

    // Check messageType
    if (p.messageType) {
      received.push(`messageType: "${p.messageType}"`);
    } else {
      missing.push('messageType');
    }

    // Check timestamp
    let finalTimestamp = new Date().toISOString();
    if (p.timestamp) {
      const parsedTime = new Date(p.timestamp);
      if (!isNaN(parsedTime.getTime())) {
        finalTimestamp = p.timestamp;
        received.push(`timestamp: "${p.timestamp}"`);
      } else {
        errors.push(`Timestamp không hợp lệ: "${p.timestamp}"`);
      }
    } else {
      missing.push('timestamp');
      inferred.push(`timestamp (dùng thời gian nhận của bộ giám sát UTM: ${finalTimestamp})`);
    }

    // Simulation time in seconds
    if (typeof p.simulationTimeSec === 'number') {
      received.push(`simulationTimeSec: ${p.simulationTimeSec}s`);
    } else {
      missing.push('simulationTimeSec');
    }

    const u = p.uav || {
      id: p.uav_id || p.id,
      position: p.localPosition
        ? { x: p.localPosition.x, y: p.localPosition.y, z: p.localPosition.z, altitudeAGL_m: p.localPosition.z }
        : typeof p.x === 'number' && typeof p.y === 'number'
        ? { x: p.x, y: p.y, z: p.z, altitudeAGL_m: p.z }
        : undefined,
      movement:
        typeof p.speed_mps === 'number' || typeof p.headingDeg === 'number'
          ? { groundSpeed_mps: p.speed_mps, headingDeg: p.headingDeg }
          : undefined,
    };

    if (!u || (!u.id && !u.position)) {
      errors.push("Thiếu đối tượng 'uav' trong bản tin");
      return { receivedFields: received, inferredFields: inferred, missingFields: missing, errors };
    }

    // UAV ID
    if (!u.id || typeof u.id !== 'string') {
      errors.push("Thiếu trường 'uav.id'");
    } else {
      received.push(`uav.id: "${u.id}"`);
    }

    // Callsign
    if (u.callsign) {
      received.push(`uav.callsign: "${u.callsign}"`);
    } else {
      missing.push('uav.callsign');
    }

    // UAV Type
    let mappedType: UAVType = 'MULTIROTOR';
    if (u.type) {
      received.push(`uav.type: "${u.type}"`);
      const lowerType = u.type.toLowerCase();
      if (lowerType.includes('fixed') || lowerType.includes('wing')) {
        mappedType = 'FIXED_WING';
      } else if (lowerType.includes('vtol')) {
        mappedType = 'VTOL';
      } else {
        mappedType = 'MULTIROTOR';
      }
    } else {
      missing.push('uav.type');
      inferred.push('uav.type (suy ra mặc định MULTIROTOR)');
    }

    // Position (Supports both WGS84 lat/lon and Gazebo local ENU x/y/z)
    if (!u.position) {
      errors.push("Thiếu đối tượng 'uav.position'");
      return { receivedFields: received, inferredFields: inferred, missingFields: missing, errors };
    }

    const pos = u.position;
    let finalLat = pos.latitude;
    let finalLon = pos.longitude;
    let altitudeM = 0;
    let altitudeRef: 'AGL' | 'MSL' = 'AGL';

    const hasWgs84 = typeof pos.latitude === 'number' && typeof pos.longitude === 'number';
    const hasLocalEnu = typeof pos.x === 'number' && typeof pos.y === 'number';

    if (hasWgs84) {
      if (pos.latitude! < -90 || pos.latitude! > 90) {
        errors.push(`Vĩ độ (latitude) không hợp lệ: ${pos.latitude}`);
      } else {
        received.push(`uav.position.latitude: ${pos.latitude}`);
      }

      if (pos.longitude! < -180 || pos.longitude! > 180) {
        errors.push(`Kinh độ (longitude) không hợp lệ: ${pos.longitude}`);
      } else {
        received.push(`uav.position.longitude: ${pos.longitude}`);
      }
    } else if (hasLocalEnu) {
      const localZ =
        typeof pos.altitudeAGL_m === 'number'
          ? pos.altitudeAGL_m
          : typeof pos.z === 'number'
          ? pos.z
          : 0;
      const converted = enuToWgs84(pos.x!, pos.y!, localZ, DANANG_ENU_ORIGIN);
      finalLat = converted.latitude;
      finalLon = converted.longitude;
      received.push(`local_enu: (x=${pos.x}m, y=${pos.y}m)`);
      inferred.push(
        `WGS84 quy đổi từ Gazebo ENU quanh tâm Đà Nẵng (${finalLat}, ${finalLon})`
      );
    } else {
      errors.push("Thiếu tọa độ 'latitude/longitude' hoặc tọa độ cục bộ 'x/y'");
    }

    // Altitude: AGL vs MSL (or local Z)
    if (typeof pos.altitudeAGL_m === 'number') {
      altitudeM = pos.altitudeAGL_m;
      altitudeRef = 'AGL';
      received.push(`uav.position.altitudeAGL_m: ${pos.altitudeAGL_m}m (AGL)`);
    } else if (typeof pos.altitudeMSL_m === 'number') {
      altitudeM = pos.altitudeMSL_m;
      altitudeRef = 'MSL';
      received.push(`uav.position.altitudeMSL_m: ${pos.altitudeMSL_m}m (MSL)`);
    } else if (hasLocalEnu && typeof pos.z === 'number') {
      altitudeM = pos.z;
      altitudeRef = 'AGL';
      received.push(`local_enu.z: ${pos.z}m (AGL)`);
    } else {
      missing.push('uav.position.altitudeAGL_m (hoặc altitudeMSL_m)');
      errors.push('Thiếu thông số độ cao (altitudeAGL_m)');
    }

    // Movement (Ground speed, heading, air speed, drift angle)
    let groundSpeedMps = 0;
    let headingDeg = 0;
    let airSpeedMps: number | undefined = undefined;
    let driftAngleDeg: number | undefined = undefined;
    let verticalSpeedMps: number | undefined = undefined;

    if (u.movement) {
      const mov = u.movement;
      if (typeof mov.groundSpeed_mps === 'number' && mov.groundSpeed_mps >= 0) {
        groundSpeedMps = mov.groundSpeed_mps;
        received.push(`uav.movement.groundSpeed_mps: ${mov.groundSpeed_mps} m/s`);
      } else {
        missing.push('uav.movement.groundSpeed_mps');
      }

      if (typeof mov.headingDeg === 'number') {
        headingDeg = (mov.headingDeg % 360 + 360) % 360;
        received.push(`uav.movement.headingDeg: ${mov.headingDeg}°`);
      } else {
        missing.push('uav.movement.headingDeg');
      }

      if (typeof mov.airSpeed_mps === 'number') {
        airSpeedMps = mov.airSpeed_mps;
        received.push(`uav.movement.airSpeed_mps: ${mov.airSpeed_mps} m/s`);
      }

      if (typeof mov.driftAngleDeg === 'number') {
        driftAngleDeg = mov.driftAngleDeg;
        received.push(`uav.movement.driftAngleDeg: ${mov.driftAngleDeg}°`);
      }

      if (typeof mov.verticalSpeed_mps === 'number') {
        verticalSpeedMps = mov.verticalSpeed_mps;
        received.push(`uav.movement.verticalSpeed_mps: ${mov.verticalSpeed_mps} m/s`);
      } else {
        // STRICT: Do NOT fake vertical speed as 0
        missing.push('uav.movement.verticalSpeed_mps (không tự giả định bằng 0)');
      }
    } else {
      missing.push('uav.movement (groundSpeed, heading)');
      missing.push('uav.movement.vertical_speed_mps (không tự giả định bằng 0)');
      inferred.push('uav.movement (giả định groundSpeed=0, heading=0)');
    }

    // System (battery, flight mode)
    let batteryPct: number | undefined = undefined;
    let flightMode: string | undefined = undefined;

    if (u.system) {
      if (typeof u.system.batteryPercent === 'number') {
        batteryPct = Math.min(100, Math.max(0, u.system.batteryPercent));
        received.push(`uav.system.batteryPercent: ${batteryPct}%`);
      }
      if (u.system.flightMode) {
        flightMode = u.system.flightMode;
        received.push(`uav.system.flightMode: "${flightMode}"`);
      }
    } else {
      missing.push('uav.system (batteryPercent, flightMode)');
    }

    // Sequence & Flight Plan checks
    let currentSeq: number;
    let isInferredSequence = true;
    if (typeof p.sequence === 'number' && Number.isInteger(p.sequence) && p.sequence >= 0) {
      currentSeq = p.sequence;
      isInferredSequence = false;
      received.push(`sequence: ${currentSeq} (nguồn)`);
    } else {
      missing.push('sequence (bản tin chưa có số thứ tự nguồn)');
      currentSeq = (this.receiveSequenceMap.get(u.id || 'UNKNOWN') || 0) + 1;
      this.receiveSequenceMap.set(u.id || 'UNKNOWN', currentSeq);
      inferred.push(`sequence (gán số thứ tự tiếp nhận nội bộ receive_sequence = ${currentSeq})`);
    }

    if (p.flightPlanId && typeof p.flightPlanId === 'string') {
      received.push(`flightPlanId: "${p.flightPlanId}"`);
    } else {
      missing.push('flight_plan_id (chưa liên kết kế hoạch 4D)');
    }
    missing.push('schema_version');

    // Inferred status
    let inferredStatus: UAVTelemetryMessage['status'] = 'UNKNOWN';
    if (flightMode && flightMode.toUpperCase().includes('CONTROL')) {
      inferredStatus = groundSpeedMps > 0.5 ? 'FLYING' : 'HOVER';
      inferred.push(`status (suy ra '${inferredStatus}' từ flightMode và groundSpeed)`);
    } else if (groundSpeedMps > 0.5) {
      inferredStatus = 'FLYING';
      inferred.push(`status (suy ra 'FLYING' do groundSpeed > 0)`);
    } else {
      inferredStatus = 'UNKNOWN';
    }

    if (errors.length > 0) {
      return { receivedFields: received, inferredFields: inferred, missingFields: missing, errors };
    }

    // Create normalized UAVPerformanceProfile based on mapped type
    const uavProfile: UAVPerformanceProfile = {
      uav_type: mappedType,
      model_name: u.callsign ? `${u.callsign} (${mappedType})` : `External ${mappedType} UAV`,
      manufacturer: 'External SITL / Gazebo Simulator',
      dimensions_m: mappedType === 'FIXED_WING' 
        ? { length: 2.1, wingspan_or_diameter: 3.2, height: 0.5 }
        : mappedType === 'VTOL'
        ? { length: 1.8, wingspan_or_diameter: 2.8, height: 0.6 }
        : { length: 0.8, wingspan_or_diameter: 0.9, height: 0.4 },
      mtow_kg: mappedType === 'FIXED_WING' ? 18.0 : mappedType === 'VTOL' ? 15.0 : 9.0,
      max_ground_speed_mps: Math.max(25, groundSpeedMps * 1.3),
      cruise_speed_mps: groundSpeedMps > 0 ? groundSpeedMps : 15,
      max_climb_rate_mps: 6.0,
      max_descent_rate_mps: 5.0,
      max_turn_rate_deg_s: mappedType === 'FIXED_WING' ? 35 : 90,
      max_flight_time_min: mappedType === 'FIXED_WING' ? 120 : 45,
      battery_capacity_mah: batteryPct ? batteryPct * 60 : undefined,
    };

    const telemetry: UAVTelemetryMessage = {
      schema_version: '1.0-external-adapter',
      type: 'uav.telemetry',
      sequence: currentSeq,
      is_inferred_sequence: isInferredSequence,
      timestamp: finalTimestamp,
      message_created_at: finalTimestamp,
      simulation_time_sec: p.simulationTimeSec,
      uav_id: u.id!,
      callsign: u.callsign,
      flight_plan_id: p.flightPlanId,
      position: {
        latitude: finalLat!,
        longitude: finalLon!,
        altitude_m: altitudeM,
        altitude_reference: altitudeRef, // Preserves AGL strictly
      },
      velocity: {
        ground_speed_mps: groundSpeedMps,
        vertical_speed_mps: verticalSpeedMps,
        heading_deg: headingDeg,
        air_speed_mps: airSpeedMps,
        drift_angle_deg: driftAngleDeg,
      },
      status: inferredStatus,
      flight_mode: flightMode,
      battery_pct: batteryPct,
      uav_profile: uavProfile,
      data_source_format: 'PHUOC_ASTM_F3411',
    };

    return {
      receivedFields: received,
      inferredFields: inferred,
      missingFields: missing,
      telemetry,
      errors: [],
    };
  }

  /**
   * Adapts raw Phuoc message (telemetry, environment, or airspace) into IngestibleMessage or array of messages
   */
  public static adapt(raw: unknown): IngestibleMessage | IngestibleMessage[] | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    // 1. Telemetry branch
    if (this.isPhuocTelemetry(raw)) {
      const analysis = this.analyzeAndAdapt(raw);
      if (analysis.telemetry && analysis.errors.length === 0) {
        return analysis.telemetry;
      }
      return null;
    }

    // 2. Environment / Airspace branch
    if (
      obj.messageType === 'ENVIRONMENT_STATE' ||
      obj.messageType === 'ENVIRONMENT_STATUS' ||
      obj.environment
    ) {
      const results: IngestibleMessage[] = [];
      const envData = (obj.environment || obj) as Record<string, unknown>;
      const windObj = (envData.wind || {}) as Record<string, unknown>;
      
      const windSpeed = typeof envData.windSpeed_mps === 'number'
        ? envData.windSpeed_mps
        : typeof windObj.speed_mps === 'number'
        ? windObj.speed_mps
        : 0;
      const windDir = typeof envData.windDirectionDeg === 'number'
        ? envData.windDirectionDeg
        : typeof windObj.directionDeg === 'number'
        ? windObj.directionDeg
        : 0;

      const envState: EnvironmentState = {
        timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : new Date().toISOString(),
        wind_speed_mps: windSpeed,
        wind_direction_deg: windDir,
        temperature_c: typeof envData.temperatureC === 'number' ? envData.temperatureC : 28,
        visibility_km: typeof envData.visibilityKm === 'number' ? envData.visibilityKm : 10,
        weather_condition: (typeof envData.weatherCondition === 'string' && ['CLEAR','CLOUDY','RAIN','HIGH_WIND','FOG'].includes(envData.weatherCondition)) 
          ? (envData.weatherCondition as EnvironmentState['weather_condition'])
          : 'CLEAR',
      };
      results.push({ type: 'environment.state', payload: envState });

      // Unpack nested restricted zones from Phuoc's environment packet if present
      if (Array.isArray(envData.restrictedZones)) {
        for (const rz of envData.restrictedZones as Array<Record<string, unknown>>) {
          const altLimits = (rz.altitudeLimits || {}) as Record<string, unknown>;
          const minAlt = typeof altLimits.minAltitudeAGL_m === 'number' 
            ? altLimits.minAltitudeAGL_m 
            : typeof rz.minAltitude === 'number' 
            ? rz.minAltitude 
            : 0;
          const maxAlt = typeof altLimits.maxAltitudeAGL_m === 'number' 
            ? altLimits.maxAltitudeAGL_m 
            : typeof rz.maxAltitude === 'number' 
            ? rz.maxAltitude 
            : 500;

          const boundary: Array<{ latitude: number; longitude: number }> = [];
          const polygonCoords = rz.boundaryPolygonCoordinates || rz.polygonFlat;
          if (Array.isArray(polygonCoords)) {
            const coords = polygonCoords as number[];
            for (let i = 0; i < coords.length; i += 2) {
              if (coords[i + 1] !== undefined) {
                // Phuoc coordinates in polygonFlat are [lon, lat]
                boundary.push({ longitude: coords[i], latitude: coords[i + 1] });
              }
            }
          }

          if (boundary.length >= 3) {
            results.push({
              type: 'zone.update',
              payload: {
                zone_id: String(rz.zoneId || rz.id || `NFZ-PHUOC-${Date.now()}`),
                name: String(rz.name || 'Vùng cấm bay'),
                type: 'NFZ_AIRPORT',
                min_altitude_m: minAlt,
                max_altitude_m: maxAlt,
                boundary,
                color: (typeof rz.color === 'string') ? rz.color : '#ef4444',
                active: true,
                notes: 'Đồng bộ từ nguồn mô phỏng ngoài (External Simulator)',
              },
            });
          }
        }
      }

      return results.length === 1 ? results[0] : results;
    }

    // 3. Airspace restrictions standalone branch
    if (obj.messageType === 'AIRSPACE_RESTRICTIONS' || obj.restrictedZones) {
      const zoneData = (obj.zone || obj) as Record<string, unknown>;
      if (zoneData.boundary && Array.isArray(zoneData.boundary)) {
        const zone: RestrictedZone = {
          zone_id: String(zoneData.zone_id || zoneData.id || `NFZ-EXT-${Date.now()}`),
          name: String(zoneData.name || 'Vùng cấm bay từ nguồn ngoài'),
          type: 'NFZ_AIRPORT',
          min_altitude_m: typeof zoneData.min_altitude_m === 'number' ? zoneData.min_altitude_m : 0,
          max_altitude_m: typeof zoneData.max_altitude_m === 'number' ? zoneData.max_altitude_m : 500,
          boundary: zoneData.boundary as Array<{ latitude: number; longitude: number }>,
          color: '#ef4444',
          active: true,
          notes: 'Cập nhật từ nguồn không phận thời gian thực',
        };
        return { type: 'zone.update', payload: zone };
      }
    }

    return null;
  }
}

export const ExternalTelemetryAdapter = PhuocTelemetryAdapter;
