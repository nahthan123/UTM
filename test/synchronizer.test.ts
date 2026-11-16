import { describe, it, expect } from 'vitest';
import { TelemetrySynchronizer } from '../src/services/synchronizer/TelemetrySynchronizer';
import { UAVTelemetryMessage, FlightPlan } from '../src/types/telemetry';
import { MOCK_FLIGHT_PLANS } from '../src/data/mockScenarios';

describe('TelemetrySynchronizer (Part 2 Simulation Output vs Part 4 Observed State)', () => {
  const synchronizer = new TelemetrySynchronizer();
  const testPlan: FlightPlan = MOCK_FLIGHT_PLANS[0];

  const part2OutputSample1: UAVTelemetryMessage = {
    schema_version: '1.0',
    type: 'uav.telemetry',
    sequence: 50,
    timestamp: '2026-10-18T10:00:00.000Z',
    message_created_at: '2026-10-18T10:00:00.050Z',
    simulation_id: 'SIM-DANANG-001',
    uav_id: 'UAV-001',
    flight_plan_id: 'PLAN-MED-01',
    position: {
      latitude: 16.0716,
      longitude: 108.2140,
      altitude_m: 90.0,
      altitude_reference: 'MSL',
    },
    velocity: {
      ground_speed_mps: 12.0,
      vertical_speed_mps: 0.0,
      heading_deg: 90,
    },
    status: 'FLYING',
  };

  it('so sánh chính xác bản tin đầu ra Phần 2 với trạng thái Phần 4 tiếp nhận', () => {
    const receptionTime = new Date('2026-10-18T10:00:00.090Z'); // 40ms transmission delay
    const { state, isDuplicate, isOutOfOrder, gapDetected } = synchronizer.processTelemetry(
      part2OutputSample1,
      undefined,
      testPlan,
      receptionTime
    );

    expect(isDuplicate).toBe(false);
    expect(isOutOfOrder).toBe(false);
    expect(gapDetected).toBe(0);

    // Physical observation must match Part 2 output exactly
    expect(state.position.latitude).toBe(part2OutputSample1.position.latitude);
    expect(state.position.longitude).toBe(part2OutputSample1.position.longitude);
    expect(state.position.altitude_m).toBe(part2OutputSample1.position.altitude_m);
    expect(state.velocity.ground_speed_mps).toBe(part2OutputSample1.velocity.ground_speed_mps);

    // Measure transmission latency
    expect(state.data_quality.latency_ms).toBe(40);
    expect(state.data_quality.freshness).toBe('FRESH');
    expect(state.data_quality.confidence).toBe('HIGH');
  });

  it('phát hiện bản tin trùng lặp (duplicate sequence)', () => {
    const receptionTime = new Date('2026-10-18T10:00:00.090Z');
    const { state: initial } = synchronizer.processTelemetry(part2OutputSample1, undefined, testPlan, receptionTime);

    // Resend same sequence 50
    const duplicateMsg = { ...part2OutputSample1 };
    const { isDuplicate } = synchronizer.processTelemetry(duplicateMsg, initial, testPlan, new Date('2026-10-18T10:00:00.120Z'));

    expect(isDuplicate).toBe(true);
  });

  it('phát hiện bản tin đến sai thứ tự (out-of-order sequence)', () => {
    const receptionTime = new Date('2026-10-18T10:00:00.090Z');
    const { state: stateSeq50 } = synchronizer.processTelemetry(part2OutputSample1, undefined, testPlan, receptionTime);

    // Telemetry with older sequence 48 arrives late
    const oldMsg: UAVTelemetryMessage = {
      ...part2OutputSample1,
      sequence: 48,
      timestamp: '2026-10-18T09:59:58.000Z',
    };

    const { isOutOfOrder, state } = synchronizer.processTelemetry(oldMsg, stateSeq50, testPlan, new Date());
    expect(isOutOfOrder).toBe(true);
    expect(state.data_quality.out_of_order_count).toBe(1);
    expect(state.data_quality.confidence).toBe('LOW');
  });

  it('phát hiện nhảy cóc chuỗi (dropped packets gap detection)', () => {
    const receptionTime = new Date('2026-10-18T10:00:00.090Z');
    const { state: stateSeq50 } = synchronizer.processTelemetry(part2OutputSample1, undefined, testPlan, receptionTime);

    // Sequence jumps from 50 to 54 -> 3 packets dropped (51, 52, 53)
    const jumpedMsg: UAVTelemetryMessage = {
      ...part2OutputSample1,
      sequence: 54,
      timestamp: '2026-10-18T10:00:04.000Z',
    };

    const { gapDetected, state } = synchronizer.processTelemetry(jumpedMsg, stateSeq50, testPlan, new Date());
    expect(gapDetected).toBe(3);
    expect(state.data_quality.sequence_gap_count).toBe(3);
  });

  it('tính toán đúng sai lệch không gian và thời gian của kế hoạch bay 4D', () => {
    // UAV at BV Da Nang waypoint (WP-01-A: lat 16.0716, lon 108.2140, alt 90m, planned_time: 10:01:00Z)
    const onTrackMsg: UAVTelemetryMessage = {
      ...part2OutputSample1,
      timestamp: '2026-10-18T10:01:15.000Z', // 15 seconds after ETA
    };

    const deviation = synchronizer.calculate4DPlanDeviation(onTrackMsg, testPlan);
    expect(deviation.cross_track_error_m).toBeLessThan(10); // Close to corridor center
    expect(deviation.vertical_deviation_m).toBeLessThan(5);
    expect(deviation.within_spatial_corridor).toBe(true);
    // 15 seconds late is within 30s tolerance
    expect(deviation.time_deviation_s).toBe(15);
    expect(deviation.within_time_corridor).toBe(true);
    expect(deviation.within_corridor).toBe(true);
  });

  it('phát hiện trạng thái dữ liệu chuyển từ FRESH sang DEGRADED và STALE khi không nhận được tin mới', () => {
    const initialTime = new Date('2026-10-18T10:00:00.000Z');
    const { state } = synchronizer.processTelemetry(part2OutputSample1, undefined, testPlan, initialTime);

    expect(state.data_quality.freshness).toBe('FRESH');

    // 3 seconds later (> 2500ms degraded threshold)
    const timeDegraded = new Date('2026-10-18T10:00:03.000Z');
    const evaluatedDegraded = synchronizer.evaluateLiveness(state, timeDegraded, false);
    expect(evaluatedDegraded.data_quality.freshness).toBe('DEGRADED');

    // 8 seconds later (> 6000ms stale threshold)
    const timeStale = new Date('2026-10-18T10:00:08.000Z');
    const evaluatedStale = synchronizer.evaluateLiveness(state, timeStale, false);
    expect(evaluatedStale.data_quality.freshness).toBe('STALE');
    expect(evaluatedStale.data_quality.is_stale).toBe(true);
  });

  it('không báo động mất kết nối sai khi mô phỏng đang tạm dừng (Pause awareness)', () => {
    const initialTime = new Date('2026-10-18T10:00:00.000Z');
    const { state } = synchronizer.processTelemetry(part2OutputSample1, undefined, testPlan, initialTime);

    // 10 seconds later, but simulation is paused (isSimulationPaused = true)
    const timeAfterPause = new Date('2026-10-18T10:00:10.000Z');
    const evaluated = synchronizer.evaluateLiveness(state, timeAfterPause, true);
    // Must not turn to STALE
    expect(evaluated.data_quality.is_stale).toBe(false);
  });
});
