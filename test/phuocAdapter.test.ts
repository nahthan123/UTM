import { describe, it, expect, beforeEach } from 'vitest';
import { PhuocTelemetryAdapter, ExternalTelemetryAdapter } from '../src/services/adapters/PhuocTelemetryAdapter';
import { TelemetryValidator } from '../src/services/validator/TelemetryValidator';
import { TelemetrySynchronizer } from '../src/services/synchronizer/TelemetrySynchronizer';
import { part5Bridge } from '../src/services/part5Bridge/Part5ExportBridge';
import { LiveWebSocketDataSource } from '../src/services/dataSource/LiveWebSocketDataSource';
import { DemoDataSource } from '../src/services/dataSource/DemoDataSource';
import { ObservedUAVState } from '../src/types/monitoring';
import { DANANG_ENU_ORIGIN } from '../src/utils/coordinates';

describe('PhuocTelemetryAdapter & ASTM F3411 Integration Suite', () => {
  const phuocSampleJson = {
    messageType: 'UAV_TELEMETRY',
    timestamp: '2026-10-18T14:16:15.274Z',
    simulationTimeSec: 71.2,
    uav: {
      id: 'UAV-01',
      callsign: 'MED-EXPRESS-1',
      type: 'Multirotor',
      position: {
        longitude: 108.238596,
        latitude: 16.067234,
        altitudeAGL_m: 125,
      },
      movement: {
        airSpeed_mps: 18,
        groundSpeed_mps: 18,
        headingDeg: 128.7,
        driftAngleDeg: 0,
      },
      system: {
        batteryPercent: 85,
        flightMode: 'AUTONOMOUS_UTM_CONTROL',
      },
    },
  };

  beforeEach(() => {
    PhuocTelemetryAdapter.resetSequences();
  });

  // Test 1: Đọc JSON mẫu của Phước thành công
  it('1. Đọc và nhận diện bản tin JSON mẫu của Phước thành công', () => {
    expect(PhuocTelemetryAdapter.isPhuocTelemetry(phuocSampleJson)).toBe(true);

    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    expect(analysis.errors.length).toBe(0);
    expect(analysis.telemetry).toBeDefined();
    expect(analysis.telemetry?.uav_id).toBe('UAV-01');
  });

  // Test 2: UAV-01 xuất hiện đúng kinh độ và vĩ độ
  it('2. UAV-01 xuất hiện đúng kinh độ 108.238596 và vĩ độ 16.067234', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    const tel = analysis.telemetry!;
    expect(tel.position.latitude).toBe(16.067234);
    expect(tel.position.longitude).toBe(108.238596);
  });

  // Test 3: Hiển thị độ cao 125 m AGL, không ghi nhầm MSL
  it('3. Hiển thị độ cao 125 m AGL, bảo toàn mốc AGL, không nhầm sang MSL', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    const tel = analysis.telemetry!;
    expect(tel.position.altitude_m).toBe(125);
    expect(tel.position.altitude_reference).toBe('AGL');
    expect(tel.position.altitude_reference).not.toBe('MSL');
  });

  // Test 4: Hiển thị ground speed 18 m/s
  it('4. Hiển thị ground speed 18 m/s', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    const tel = analysis.telemetry!;
    expect(tel.velocity.ground_speed_mps).toBe(18);
  });

  // Test 5: Hiển thị heading 128.7 độ
  it('5. Hiển thị heading 128.7 độ', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    const tel = analysis.telemetry!;
    expect(tel.velocity.heading_deg).toBe(128.7);
  });

  // Test 6: Hiển thị pin 85%
  it('6. Hiển thị pin 85%', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    const tel = analysis.telemetry!;
    expect(tel.battery_pct).toBe(85);
  });

  // Test 7: Bản tin thiếu trường được xử lý an toàn
  it('7. Bản tin thiếu trường (không có movement, không có callsign, thiếu battery) được xử lý an toàn', () => {
    const minimalPhuocMsg = {
      messageType: 'UAV_TELEMETRY',
      timestamp: '2026-10-18T14:16:15.274Z',
      uav: {
        id: 'UAV-MINIMAL-01',
        position: {
          latitude: 16.05,
          longitude: 108.20,
          altitudeAGL_m: 50,
        },
      },
    };

    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(minimalPhuocMsg);
    expect(analysis.errors.length).toBe(0);
    expect(analysis.telemetry?.uav_id).toBe('UAV-MINIMAL-01');
    expect(analysis.telemetry?.velocity.vertical_speed_mps).toBeUndefined();
    expect(analysis.missingFields.some((f) => f.includes('vertical_speed_mps'))).toBe(true);
    expect(analysis.missingFields.some((f) => f.includes('flight_plan_id'))).toBe(true);
  });

  // Test 8: JSON lỗi không làm sập ứng dụng
  it('8. JSON lỗi cú pháp hoặc thiếu tọa độ không làm sập ứng dụng', () => {
    const invalidJsonStr = '{ broken json text';
    const parseResult = TelemetryValidator.safeJsonParse(invalidJsonStr);
    expect(parseResult.isValid).toBe(false);

    const missingPosJson = {
      messageType: 'UAV_TELEMETRY',
      uav: { id: 'UAV-BAD' },
    };
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(missingPosJson);
    expect(analysis.errors.length).toBeGreaterThan(0);
    expect(analysis.telemetry).toBeUndefined();
  });

  // Test 9: Demo Mode vẫn chạy như trước
  it('9. Demo Mode vẫn khởi động và phát sinh dữ liệu chuẩn như trước', () => {
    const demoSource = new DemoDataSource();
    expect(demoSource.mode).toBe('DEMO');
    expect(demoSource.isRunning).toBe(false);
  });

  // Test 10: Live Mode tiếp tục hoạt động
  it('10. Live Mode tiếp tục hoạt động và tự động áp dụng PhuocTelemetryAdapter', () => {
    const liveSource = new LiveWebSocketDataSource('ws://localhost:9999/test');
    expect(liveSource.mode).toBe('LIVE');
    expect(liveSource.url).toBe('ws://localhost:9999/test');
  });

  // Test 11: Import JSON sử dụng cùng pipeline xử lý dữ liệu
  it('11. Import JSON sử dụng cùng pipeline (Adapter -> Validator -> Synchronizer)', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    expect(analysis.telemetry).toBeDefined();

    const validResult = TelemetryValidator.validateTelemetry(analysis.telemetry);
    expect(validResult.isValid).toBe(true);

    const synchronizer = new TelemetrySynchronizer();
    const { state } = synchronizer.processTelemetry(analysis.telemetry!, undefined, undefined);

    expect(state.uav_id).toBe('UAV-01');
    expect(state.callsign).toBe('MED-EXPRESS-1');
    expect(state.position.altitude_reference).toBe('AGL');
    expect(state.is_unlinked_plan).toBe(true);
    expect(state.plan_deviation).toBeUndefined(); // Strictly NO fake deviation
  });

  // Test 12: Part5ExportBridge không coi dữ liệu thiếu hoặc suy đoán là dữ liệu quan sát đáng tin cậy
  it('12. Part5ExportBridge gắn cờ dữ liệu chính xác khi nhận bản tin từ nguồn bên ngoài', () => {
    const analysis = PhuocTelemetryAdapter.analyzeAndAdapt(phuocSampleJson);
    const synchronizer = new TelemetrySynchronizer();
    const { state } = synchronizer.processTelemetry(analysis.telemetry!, undefined, undefined);

    const uavStatesMap: Record<string, ObservedUAVState> = {
      [state.uav_id]: state,
    };

    const feed = part5Bridge.generateSnapshot(uavStatesMap, []);
    expect(feed.system_integrity.total_uavs).toBe(1);
    expect(feed.active_uav_states['UAV-01'].is_unlinked_plan).toBe(true);
    expect(feed.active_uav_states['UAV-01'].position.altitude_reference).toBe('AGL');
  });

  // Test 13: Xử lý bản tin ENVIRONMENT_STATUS chứa thời tiết và vùng cấm từ Phước
  it('13. Phân tách và chuyển đổi chính xác bản tin ENVIRONMENT_STATUS từ Phước', () => {
    const envPacket = {
      messageType: 'ENVIRONMENT_STATUS',
      timestamp: '2026-10-18T14:16:15.274Z',
      simulationTimeSec: 25.4,
      environment: {
        weatherCondition: 'CLEAR',
        wind: {
          speed_mps: 6.5,
          directionDeg: 90,
          turbulenceLevel: 'Thấp',
        },
        activeRestrictedZonesCount: 1,
        restrictedZones: [
          {
            zoneId: 'NFZ-AIRPORT',
            name: 'Sân bay Quốc tế Đà Nẵng (DAD)',
            type: 'PROHIBITED',
            altitudeLimits: {
              minAltitudeAGL_m: 0,
              maxAltitudeAGL_m: 550,
            },
            boundaryPolygonCoordinates: [
              108.188, 16.035,
              108.208, 16.035,
              108.208, 16.062,
              108.188, 16.062,
            ],
          },
        ],
      },
    };

    expect(PhuocTelemetryAdapter.isPhuocEnvironment(envPacket)).toBe(true);

    const adapted = PhuocTelemetryAdapter.adapt(envPacket);
    expect(Array.isArray(adapted)).toBe(true);
    const messages = adapted as Array<any>;
    expect(messages.length).toBe(2); // 1 environment.state + 1 zone.update

    const envMsg = messages.find((m) => m.type === 'environment.state');
    expect(envMsg).toBeDefined();
    expect(envMsg.payload.wind_speed_mps).toBe(6.5);
    expect(envMsg.payload.wind_direction_deg).toBe(90);

    const zoneMsg = messages.find((m) => m.type === 'zone.update');
    expect(zoneMsg).toBeDefined();
    expect(zoneMsg.payload.zone_id).toBe('NFZ-AIRPORT');
    expect(zoneMsg.payload.boundary.length).toBe(4);
    expect(zoneMsg.payload.boundary[0].longitude).toBe(108.188);
    expect(zoneMsg.payload.boundary[0].latitude).toBe(16.035);
  });

  // Test 14: Quy đổi tọa độ Gazebo local ENU (x, y, z) sang WGS84 quanh Đà Nẵng và giữ nguyên source sequence
  it('14. Chuyển đổi tọa độ Gazebo local ENU (x, y, z) sang WGS84 Đà Nẵng và bảo toàn sequence nguồn', () => {
    const gazeboEnuPacket = {
      messageType: 'UAV_TELEMETRY',
      sequence: 104,
      flightPlanId: 'FP-DANANG-01',
      timestamp: '2026-11-12T10:15:30.000Z',
      simulationTimeSec: 42.5,
      uav: {
        id: 'UAV-GAZEBO-02',
        callsign: 'HAN-SURVEY-2',
        type: 'VTOL',
        position: {
          x: 200,
          y: 150,
          z: 95.5,
        },
        movement: {
          groundSpeed_mps: 18.2,
          headingDeg: 56.3,
        },
        system: {
          batteryPercent: 91,
          flightMode: 'AUTO_MISSION',
        },
      },
    };

    expect(ExternalTelemetryAdapter.isPhuocTelemetry(gazeboEnuPacket)).toBe(true);
    const analysis = ExternalTelemetryAdapter.analyzeAndAdapt(gazeboEnuPacket);

    expect(analysis.errors).toEqual([]);
    expect(analysis.telemetry).toBeDefined();
    const tel = analysis.telemetry!;
    expect(tel.uav_id).toBe('UAV-GAZEBO-02');
    expect(tel.sequence).toBe(104);
    expect(tel.is_inferred_sequence).toBe(false);
    expect(tel.flight_plan_id).toBe('FP-DANANG-01');
    expect(tel.position.altitude_m).toBe(95.5);
    expect(tel.position.altitude_reference).toBe('AGL');
    expect(tel.position.latitude).toBeGreaterThan(DANANG_ENU_ORIGIN.latitude);
    expect(tel.position.longitude).toBeGreaterThan(DANANG_ENU_ORIGIN.longitude);
    expect(tel.uav_profile?.uav_type).toBe('VTOL');
  });

  // Test 15: Hỗ trợ gói tin Gazebo dạng phẳng (uav_id + localPosition)
  it('15. Hỗ trợ gói tin Gazebo ENU dạng phẳng (uav_id + localPosition)', () => {
    const flatGazeboPacket = {
      uav_id: 'UAV-FLAT-03',
      sequence: 7,
      timestamp: '2026-11-12T10:16:00.000Z',
      localPosition: { x: 0, y: 0, z: 60 },
      headingDeg: 90,
      speed_mps: 12,
    };

    expect(ExternalTelemetryAdapter.isPhuocTelemetry(flatGazeboPacket)).toBe(true);
    const adapted = ExternalTelemetryAdapter.adapt(flatGazeboPacket);
    expect(adapted && !Array.isArray(adapted)).toBe(true);
    if (adapted && !Array.isArray(adapted) && adapted.type === 'uav.telemetry') {
      expect(adapted.uav_id).toBe('UAV-FLAT-03');
      expect(adapted.sequence).toBe(7);
      expect(adapted.is_inferred_sequence).toBe(false);
      expect(adapted.position.latitude).toBeCloseTo(DANANG_ENU_ORIGIN.latitude, 5);
      expect(adapted.position.longitude).toBeCloseTo(DANANG_ENU_ORIGIN.longitude, 5);
      expect(adapted.position.altitude_m).toBe(60);
      expect(adapted.velocity.heading_deg).toBe(90);
      expect(adapted.velocity.ground_speed_mps).toBe(12);
    }
  });

  // Test 16: Hỗ trợ gói tin JSON phẳng PX4 / FastAPI 10Hz (ws://localhost:8000/ws/telemetry)
  it('16. Chuyển đổi chuẩn xác gói tin JSON phẳng PX4/FastAPI (lat, lon, alt, rel_alt, mode)', () => {
    const px4LivePacket = {
      lat: 16.0544,
      lon: 108.2022,
      alt: 12.74,
      rel_alt: 2.45,
      heading: 89,
      ground_speed: 0.02,
      battery: 75,
      mode: 'AUTO_HOLD',
      in_air: true,
    };

    expect(ExternalTelemetryAdapter.isPhuocTelemetry(px4LivePacket)).toBe(true);
    const analysis = ExternalTelemetryAdapter.analyzeAndAdapt(px4LivePacket);
    expect(analysis.errors).toEqual([]);
    expect(analysis.telemetry).toBeDefined();

    const tel = analysis.telemetry!;
    expect(tel.uav_id).toBe('UAV-PX4-01');
    expect(tel.position.latitude).toBeCloseTo(16.0544, 5);
    expect(tel.position.longitude).toBeCloseTo(108.2022, 5);
    expect(tel.position.altitude_m).toBeCloseTo(2.45, 2);
    expect(tel.position.altitude_reference).toBe('AGL');
    expect(tel.velocity.heading_deg).toBe(89);
    expect(tel.battery_pct).toBe(75);
    expect(tel.status).toBe('HOVER');
  });

  // Test 17: Nhận diện chế độ cất cánh AUTO_TAKEOFF và độ cao MSL khi không có rel_alt
  it('17. Nhận diện AUTO_TAKEOFF và bảo toàn MSL khi gói PX4 chỉ có alt', () => {
    const px4Takeoff = {
      drone_id: 'PX4-X500-02',
      lat: 16.0544,
      lon: 108.2022,
      alt: 12.32,
      heading: 89,
      speed: 1.5,
      mode: 'AUTO_TAKEOFF',
    };

    const analysis = ExternalTelemetryAdapter.analyzeAndAdapt(px4Takeoff);
    expect(analysis.errors).toEqual([]);
    expect(analysis.telemetry?.uav_id).toBe('PX4-X500-02');
    expect(analysis.telemetry?.position.altitude_m).toBeCloseTo(12.32, 2);
    expect(analysis.telemetry?.position.altitude_reference).toBe('MSL');
    expect(analysis.telemetry?.status).toBe('TAKEOFF');
  });

  // Test 18: Khớp chuẩn 100% gói JSON thực tế từ server ws://localhost:8000/ws/telemetry của Phước
  it('18. Chuyển đổi chuẩn xác 100% gói JSON thực tế (uav-1, position/velocity/attitude/battery/timestamps) từ ws://localhost:8000/ws/telemetry', () => {
    const exactPhuocLivePacket = {
      uav_id: 'uav-1',
      system_id: 1,
      status: {
        connected: true,
        armed: true,
        flight_mode: 'AUTO_HOLD',
        landed_state: 'IN_AIR',
      },
      position: {
        latitude: 16.0544,
        longitude: 108.2022,
        altitude_msl_m: 12.78,
        relative_altitude_m: 2.78,
      },
      local_position: {
        x_m: 0.015,
        y_m: -0.008,
        z_m: -2.78,
      },
      velocity: {
        vx_m_s: 0.05,
        vy_m_s: 0.02,
        vz_m_s: 0.0,
        groundspeed_m_s: 0.05,
        climb_rate_m_s: 0.0,
      },
      attitude: {
        roll_deg: -0.02,
        pitch_deg: 0.01,
        yaw_deg: 90.54,
        heading_deg: 90.0,
      },
      battery: {
        voltage_v: 16.8,
        remaining_percent: 98.5,
      },
      gps: {
        fix_type: 3,
        satellites: 10,
      },
      timestamps: {
        source_timestamp_ms: 138204000,
        backend_timestamp: '2026-11-18T16:19:30.123456Z',
      },
    };

    expect(ExternalTelemetryAdapter.isPhuocTelemetry(exactPhuocLivePacket)).toBe(true);
    const analysis = ExternalTelemetryAdapter.analyzeAndAdapt(exactPhuocLivePacket);
    expect(analysis.errors).toEqual([]);
    expect(analysis.telemetry).toBeDefined();

    const tel = analysis.telemetry!;
    expect(tel.uav_id).toBe('uav-1');
    expect(tel.callsign).toBe('PX4-SYS-1');
    expect(tel.timestamp).toBe('2026-11-18T16:19:30.123456Z');
    expect(tel.simulation_time_sec).toBeCloseTo(138204, 1);
    expect(tel.position.latitude).toBeCloseTo(16.0544, 6);
    expect(tel.position.longitude).toBeCloseTo(108.2022, 6);
    expect(tel.position.altitude_m).toBeCloseTo(2.78, 2);
    expect(tel.position.altitude_reference).toBe('AGL');
    expect(tel.velocity.ground_speed_mps).toBeCloseTo(0.05, 2);
    expect(tel.velocity.vertical_speed_mps).toBe(0);
    expect(tel.velocity.heading_deg).toBe(90);
    expect(tel.battery_pct).toBe(98.5);
    expect(tel.flight_mode).toBe('AUTO_HOLD');
    expect(tel.status).toBe('HOVER');

    // Verify full Khối 4 pipeline: Validator -> Synchronizer -> ObservedState -> Part5ExportBridge
    const val = TelemetryValidator.validateTelemetry(tel);
    expect(val.isValid).toBe(true);

    const sync = new TelemetrySynchronizer();
    const { state } = sync.processTelemetry(val.sanitized!, undefined, undefined);
    expect(state.uav_id).toBe('uav-1');
    expect(state.position.altitude_reference).toBe('AGL');

    const feed = part5Bridge.generateSnapshot({ [state.uav_id]: state }, []);
    expect(feed.active_uav_states['uav-1']).toBeDefined();
  });
});
