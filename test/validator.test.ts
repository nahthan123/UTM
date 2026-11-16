import { describe, it, expect } from 'vitest';
import { TelemetryValidator } from '../src/services/validator/TelemetryValidator';
import { UAVTelemetryMessage } from '../src/types/telemetry';

describe('TelemetryValidator (Part 4 Ingestion Quality Gate)', () => {
  const validTelemetrySample: UAVTelemetryMessage = {
    schema_version: '1.0',
    type: 'uav.telemetry',
    sequence: 101,
    timestamp: '2026-10-18T10:00:01.000Z',
    message_created_at: '2026-10-18T10:00:01.020Z',
    simulation_id: 'SIM-001',
    uav_id: 'UAV-001',
    flight_plan_id: 'PLAN-001',
    position: {
      latitude: 16.0544,
      longitude: 108.2022,
      altitude_m: 120,
      altitude_reference: 'MSL',
    },
    velocity: {
      ground_speed_mps: 14.5,
      vertical_speed_mps: 0.2,
      heading_deg: 85,
    },
    status: 'FLYING',
  };

  it('xác thực thành công bản tin telemetry chuẩn WGS84', () => {
    const result = TelemetryValidator.validateTelemetry(validTelemetrySample);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.sanitized?.uav_id).toBe('UAV-001');
  });

  it('từ chối bản tin có vĩ độ vượt quá phạm vi WGS84 [-90, 90]', () => {
    const invalid = {
      ...validTelemetrySample,
      position: { ...validTelemetrySample.position, latitude: 95.0 },
    };
    const result = TelemetryValidator.validateTelemetry(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Vĩ độ'))).toBe(true);
  });

  it('từ chối bản tin có kinh độ vượt quá phạm vi WGS84 [-180, 180]', () => {
    const invalid = {
      ...validTelemetrySample,
      position: { ...validTelemetrySample.position, longitude: 195.0 },
    };
    const result = TelemetryValidator.validateTelemetry(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Kinh độ'))).toBe(true);
  });

  it('bắt lỗi khi thiếu các trường bắt buộc (sequence, uav_id, timestamp)', () => {
    const malformed = {
      type: 'uav.telemetry',
      schema_version: '1.0',
    };
    const result = TelemetryValidator.validateTelemetry(malformed);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('không làm sập ứng dụng khi nhận chuỗi JSON không hợp lệ (safe parse)', () => {
    const corruptString = '{ "type": "uav.telemetry", broken...';
    const result = TelemetryValidator.safeJsonParse(corruptString);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Lỗi phân tích cú pháp JSON');
  });
});
