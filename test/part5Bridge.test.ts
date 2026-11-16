import { describe, it, expect } from 'vitest';
import { part5Bridge } from '../src/services/part5Bridge/Part5ExportBridge';
import { ObservedUAVState } from '../src/types/monitoring';

describe('Part5ExportBridge (Verified Observation Interface for Tactical AI Deconfliction)', () => {
  const sampleStates: Record<string, ObservedUAVState> = {
    'UAV-001': {
      uav_id: 'UAV-001',
      flight_plan_id: 'PLAN-MED-01',
      status: 'FLYING',
      position: { latitude: 16.0716, longitude: 108.2140, altitude_m: 90, altitude_reference: 'MSL' },
      velocity: { ground_speed_mps: 12, vertical_speed_mps: 0, heading_deg: 90 },
      timestamp: '2026-10-18T10:00:00Z',
      data_quality: {
        freshness: 'FRESH',
        confidence: 'HIGH',
        sim_time_utc: '2026-10-18T10:00:00Z',
        message_created_at_utc: '2026-10-18T10:00:00.020Z',
        received_at_wall_clock_utc: '2026-10-18T10:00:00.050Z',
        freshness_age_ms: 50,
        latency_ms: 30,
        last_sequence: 10,
        sequence_gap_count: 0,
        out_of_order_count: 0,
        is_stale: false,
        is_lost: false,
        is_invalid: false,
      },
      trail: [],
    },
    'UAV-003': {
      uav_id: 'UAV-003',
      flight_plan_id: 'PLAN-INSP-03',
      status: 'FLYING',
      position: { latitude: 16.0610, longitude: 108.2205, altitude_m: 75, altitude_reference: 'MSL' },
      velocity: { ground_speed_mps: 7, vertical_speed_mps: 0, heading_deg: 90 },
      timestamp: '2026-10-18T09:59:50Z',
      data_quality: {
        freshness: 'STALE',
        confidence: 'LOW',
        sim_time_utc: '2026-10-18T09:59:50Z',
        message_created_at_utc: '2026-10-18T09:59:50.000Z',
        received_at_wall_clock_utc: '2026-10-18T09:59:50.050Z',
        freshness_age_ms: 10000,
        latency_ms: 50,
        last_sequence: 5,
        sequence_gap_count: 1,
        out_of_order_count: 0,
        is_stale: true,
        is_lost: false,
        is_invalid: false,
      },
      trail: [],
    },
  };

  it('tạo snapshot chuẩn hóa chứa dữ liệu thực tế và chỉ số chất lượng cho Phần 5', () => {
    const feed = part5Bridge.generateSnapshot(sampleStates, []);

    expect(feed.system_integrity.total_uavs).toBe(2);
    expect(feed.system_integrity.high_confidence_count).toBe(1);
    expect(feed.system_integrity.stale_count).toBe(1);

    // UAV-003 must be explicitly marked as stale so Part 5 will not assume it as real-time reliable
    expect(feed.active_uav_states['UAV-003'].data_quality.is_stale).toBe(true);
    expect(feed.active_uav_states['UAV-003'].data_quality.confidence).toBe('LOW');
  });

  it('gọi callback người đăng ký (subscriber) khi có snapshot mới', () => {
    let capturedUavsCount = 0;
    const unsubscribe = part5Bridge.subscribe((feed) => {
      capturedUavsCount = feed.system_integrity.total_uavs;
    });

    part5Bridge.generateSnapshot(sampleStates, []);
    expect(capturedUavsCount).toBe(2);

    unsubscribe();
  });
});
