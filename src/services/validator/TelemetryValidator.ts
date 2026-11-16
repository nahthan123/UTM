import { UAVTelemetryMessage, SCHEMA_VERSION } from '../../types/telemetry';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitized?: T;
}

export class TelemetryValidator {
  /**
   * Validates raw JSON string or object against UAVTelemetryMessage contract
   */
  public static validateTelemetry(raw: unknown): ValidationResult<UAVTelemetryMessage> {
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return { isValid: false, errors: ['Bản tin telemetry không phải là đối tượng JSON hợp lệ'] };
    }

    const obj = raw as Record<string, unknown>;

    // 1. Check Schema Version & Type
    if (!obj.type || obj.type !== 'uav.telemetry') {
      errors.push(`Trường 'type' không hợp lệ: mong đợi 'uav.telemetry', nhận '${obj.type}'`);
    }

    if (!obj.schema_version) {
      errors.push("Thiếu 'schema_version'");
    } else if (String(obj.schema_version) !== SCHEMA_VERSION) {
      // Allow minor compatibility or flag warning
      if (!String(obj.schema_version).startsWith('1.')) {
        errors.push(`Phiên bản schema '${obj.schema_version}' không tương thích với v1.x`);
      }
    }

    // 2. Sequence & Identifiers
    if (typeof obj.sequence !== 'number' || !Number.isInteger(obj.sequence) || obj.sequence < 0) {
      errors.push("Trường 'sequence' phải là số nguyên dương >= 0");
    }

    if (!obj.uav_id || typeof obj.uav_id !== 'string' || obj.uav_id.trim() === '') {
      errors.push("Trường 'uav_id' bắt buộc và không được để trống");
    }

    // flight_plan_id is optional (Phuoc simulator may not supply active flight plan)
    if (obj.flight_plan_id !== undefined && typeof obj.flight_plan_id !== 'string') {
      errors.push("Trường 'flight_plan_id' nếu có phải là chuỗi ký tự");
    }

    // 3. Timestamp Validation
    if (!obj.timestamp || typeof obj.timestamp !== 'string') {
      errors.push("Trường 'timestamp' bắt buộc (ISO 8601 string)");
    } else {
      const parsedDate = new Date(obj.timestamp);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Định dạng timestamp '${obj.timestamp}' không hợp lệ`);
      }
    }

    // 4. Position Validation (WGS84)
    if (!obj.position || typeof obj.position !== 'object') {
      errors.push("Thiếu đối tượng 'position'");
    } else {
      const pos = obj.position as Record<string, unknown>;

      if (typeof pos.latitude !== 'number' || isNaN(pos.latitude) || pos.latitude < -90 || pos.latitude > 90) {
        errors.push(`Vĩ độ (latitude) '${pos.latitude}' nằm ngoài phạm vi WGS84 [-90, 90]`);
      }

      if (typeof pos.longitude !== 'number' || isNaN(pos.longitude) || pos.longitude < -180 || pos.longitude > 180) {
        errors.push(`Kinh độ (longitude) '${pos.longitude}' nằm ngoài phạm vi WGS84 [-180, 180]`);
      }

      if (typeof pos.altitude_m !== 'number' || isNaN(pos.altitude_m) || pos.altitude_m < -500 || pos.altitude_m > 50000) {
        errors.push(`Độ cao '${pos.altitude_m}m' không hợp lệ đối với UAV`);
      }

      if (pos.altitude_reference && !['MSL', 'AGL', 'WGS84'].includes(String(pos.altitude_reference))) {
        errors.push(`Mốc tham chiếu độ cao '${pos.altitude_reference}' không hợp lệ (kỳ vọng MSL, AGL hoặc WGS84)`);
      }
    }

    // 5. Velocity Validation
    if (!obj.velocity || typeof obj.velocity !== 'object') {
      errors.push("Thiếu đối tượng 'velocity'");
    } else {
      const vel = obj.velocity as Record<string, unknown>;

      if (typeof vel.ground_speed_mps !== 'number' || vel.ground_speed_mps < 0 || vel.ground_speed_mps > 200) {
        errors.push(`Tốc độ mặt đất (ground_speed_mps) '${vel.ground_speed_mps}' bất thường (kỳ vọng 0-200 m/s)`);
      }

      if (typeof vel.heading_deg !== 'number' || vel.heading_deg < 0 || vel.heading_deg >= 360) {
        if (typeof vel.heading_deg === 'number') {
          (vel as Record<string, number>).heading_deg = (vel.heading_deg % 360 + 360) % 360;
        } else {
          errors.push(`Hướng bay (heading_deg) '${vel.heading_deg}' phải là số trong khoảng [0, 360)`);
        }
      }

      if (vel.vertical_speed_mps !== undefined && typeof vel.vertical_speed_mps !== 'number') {
        errors.push(`Vận tốc leo hạ (vertical_speed_mps) nếu có phải là số`);
      }
    }

    // 6. Status Validation
    const validStatuses = ['IDLE', 'PREFLIGHT', 'TAKEOFF', 'FLYING', 'HOVER', 'LANDING', 'EMERGENCY', 'LOST_LINK', 'COMPLETED', 'UNKNOWN'];
    if (!obj.status || typeof obj.status !== 'string' || !validStatuses.includes(obj.status)) {
      errors.push(`Trạng thái bay '${obj.status}' không nằm trong danh mục chuẩn UTM`);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      sanitized: obj as unknown as UAVTelemetryMessage,
    };
  }

  /**
   * Safely parse raw JSON string
   */
  public static safeJsonParse(rawString: string): ValidationResult<unknown> {
    try {
      const parsed = JSON.parse(rawString);
      return { isValid: true, errors: [], sanitized: parsed };
    } catch (e) {
      return {
        isValid: false,
        errors: [`Lỗi phân tích cú pháp JSON: ${e instanceof Error ? e.message : 'Unknown'}`],
      };
    }
  }
}
