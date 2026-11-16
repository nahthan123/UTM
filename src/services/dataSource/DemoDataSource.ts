import { IDataSource, DataSourceCallbacks } from './IDataSource';
import { UAVTelemetryMessage, MonitoringAlert, SimulationStatus } from '../../types/telemetry';
import { MOCK_FLIGHT_PLANS } from '../../data/mockScenarios';
import { calculateBearingDeg } from '../../utils/coordinates';

export class DemoDataSource implements IDataSource {
  public readonly mode = 'DEMO';
  private _isRunning = false;
  private timer: number | null = null;
  private simStatusTimer: number | null = null;
  private alertTimer: number | null = null;
  private callbacks: DataSourceCallbacks | null = null;

  // Simulation controls
  private playbackSpeed = 1.0; // 1.0 = 1x real-time, 2.0 = 2x, 4.0 = 4x
  private isPaused = false;
  private virtualSimClockMs = new Date('2026-10-18T10:00:00Z').getTime();

  // Internal simulation progress tracker for 3 UAVs
  private uavSimStates = [
    {
      uav_id: 'UAV-001',
      plan_id: 'PLAN-MED-01',
      plan: MOCK_FLIGHT_PLANS[0],
      currentSegment: 0,
      segmentProgress: 0, // 0 to 1
      speedMps: 14,
      sequence: 100,
      altitude: 100,
      skipTicks: 0,
    },
    {
      uav_id: 'UAV-002',
      plan_id: 'PLAN-SURV-02',
      plan: MOCK_FLIGHT_PLANS[1],
      currentSegment: 0,
      segmentProgress: 0,
      speedMps: 20,
      sequence: 200,
      altitude: 125,
      skipTicks: 0,
    },
    {
      uav_id: 'UAV-003',
      plan_id: 'PLAN-INSP-03',
      plan: MOCK_FLIGHT_PLANS[2],
      currentSegment: 0,
      segmentProgress: 0,
      speedMps: 8,
      sequence: 300,
      altitude: 78,
      skipTicks: 0, // Used to simulate link loss / stale detection
    },
  ];

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public getSpeed(): number {
    return this.playbackSpeed;
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    this.broadcastSimStatus();
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.broadcastSimStatus();
    return this.isPaused;
  }

  public start(callbacks: DataSourceCallbacks): void {
    if (this._isRunning) return;
    this.callbacks = callbacks;
    this._isRunning = true;

    this.callbacks.onConnectionChange('CONNECTING', 'Khởi tạo nguồn dữ liệu mô phỏng Demo...');

    setTimeout(() => {
      if (!this._isRunning) return;
      this.callbacks?.onConnectionChange('CONNECTED', 'Chế độ Demo đang chạy (Mô phỏng không phận Đà Nẵng)');
      
      this.broadcastSimStatus();
      this.startTickLoop();
      this.startAlertSchedule();
    }, 400);
  }

  public stop(): void {
    this._isRunning = false;
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.simStatusTimer) {
      window.clearInterval(this.simStatusTimer);
      this.simStatusTimer = null;
    }
    if (this.alertTimer) {
      window.clearInterval(this.alertTimer);
      this.alertTimer = null;
    }
    this.callbacks?.onConnectionChange('DISCONNECTED', 'Đã dừng nguồn dữ liệu Demo');
  }

  private broadcastSimStatus(): void {
    if (!this.callbacks) return;
    const statusMsg: SimulationStatus = {
      simulation_id: 'SIM-DANANG-TEST-001',
      status: this.isPaused ? 'PAUSED' : 'RUNNING',
      sim_time: new Date(this.virtualSimClockMs).toISOString(),
      playback_speed: this.playbackSpeed,
      active_uav_count: this.uavSimStates.length,
      timestamp: new Date().toISOString(),
    };
    this.callbacks.onMessage({
      type: 'simulation.status',
      payload: statusMsg,
    });
  }

  private startTickLoop(): void {
    // Generate telemetry ticks every 1000ms
    this.timer = window.setInterval(() => {
      if (!this._isRunning || !this.callbacks) return;

      if (!this.isPaused) {
        // Advance virtual simulation clock by (1000ms * playbackSpeed)
        this.virtualSimClockMs += 1000 * this.playbackSpeed;
      }

      const wallClockIso = new Date().toISOString();
      const simClockIso = new Date(this.virtualSimClockMs).toISOString();

      if (this.isPaused) {
        // When paused, we don't advance UAV positions, but we still emit periodic simulation status
        this.broadcastSimStatus();
        return;
      }

      this.uavSimStates.forEach((state, index) => {
        // UAV-003: Simulate communication glitch periodically
        if (state.uav_id === 'UAV-003') {
          if (state.skipTicks > 0) {
            state.skipTicks--;
            return; // Skip sending telemetry to simulate link loss / stale detection
          }
          if (state.sequence % 30 === 0) {
            state.skipTicks = 6;
            return;
          }
        }

        const waypoints = state.plan.waypoints;
        const currentWp = waypoints[state.currentSegment];
        const nextWp = waypoints[(state.currentSegment + 1) % waypoints.length];

        // Advance progress scaled by playbackSpeed
        const progressIncrement = 0.035 * this.playbackSpeed;
        state.segmentProgress += progressIncrement;
        if (state.segmentProgress >= 1) {
          state.segmentProgress = 0;
          state.currentSegment = (state.currentSegment + 1) % (waypoints.length - 1);
        }

        // Interpolate coordinates
        let lat = currentWp.latitude + (nextWp.latitude - currentWp.latitude) * state.segmentProgress;
        let lon = currentWp.longitude + (nextWp.longitude - currentWp.longitude) * state.segmentProgress;
        let alt = currentWp.altitude_m + (nextWp.altitude_m - currentWp.altitude_m) * state.segmentProgress;

        // UAV-002: Inject lateral cross-track offset to simulate drift / deviation
        if (state.uav_id === 'UAV-002') {
          const crossDrift = Math.sin(state.sequence * 0.1) * 0.00065; // ~65 meters drift
          lon += crossDrift;
          alt += Math.sin(state.sequence * 0.2) * 4;
        }

        const bearing = calculateBearingDeg(currentWp.latitude, currentWp.longitude, nextWp.latitude, nextWp.longitude);

        state.sequence += 1;

        // UAV-003: Intentionally inject a sequence gap once in a while to test packet loss detection
        if (state.uav_id === 'UAV-003' && state.sequence % 18 === 0) {
          state.sequence += 2;
        }

        const telemetryMsg: UAVTelemetryMessage = {
          schema_version: '1.0',
          type: 'uav.telemetry',
          sequence: state.sequence,
          timestamp: simClockIso,
          message_created_at: wallClockIso,
          simulation_id: 'SIM-DANANG-TEST-001',
          uav_id: state.uav_id,
          flight_plan_id: state.plan_id,
          uav_profile: state.plan.uav_profile,
          position: {
            latitude: lat,
            longitude: lon,
            altitude_m: Math.round(alt * 10) / 10,
            altitude_reference: 'MSL',
          },
          velocity: {
            ground_speed_mps: Math.round((state.speedMps + Math.sin(state.sequence) * 0.5) * 10) / 10,
            vertical_speed_mps: Math.round(0.1 * Math.sin(state.sequence) * 10) / 10,
            heading_deg: Math.round(bearing),
          },
          status: 'FLYING',
          battery_pct: Math.max(15, 95 - Math.floor(state.sequence / 10)),
          rssi_dbm: state.uav_id === 'UAV-003' && state.skipTicks > 0 ? -98 : -65,
        };

        this.callbacks?.onMessage(telemetryMsg);
      });
    }, 1000);
  }

  private startAlertSchedule(): void {
    // Generate periodic realistic events
    this.alertTimer = window.setInterval(() => {
      if (!this._isRunning || !this.callbacks || this.isPaused) return;

      const alerts: MonitoringAlert[] = [
        {
          alert_id: `ALT-${Date.now()}-1`,
          severity: 'WARNING',
          source: 'STRATEGIC_DEVIATION',
          uav_id: 'UAV-002',
          title: 'Cảnh báo lệch hành lang bay 4D',
          description: 'UAV-002 ghi nhận sai lệch ngang 62.4m vượt quá chiều rộng hành lang an toàn (40m) dọc bờ biển Mỹ Khê.',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metrics: { deviation_m: 62.4 },
        },
        {
          alert_id: `ALT-${Date.now()}-2`,
          severity: 'CRITICAL',
          source: 'TACTICAL_CONFLICT_PART5',
          uav_id: 'UAV-001',
          target_uav_id: 'UAV-002',
          title: 'Dự báo xung đột chiến thuật (Phần 5 AI)',
          description: 'Module Phần 5 phát hiện nguy cơ vi phạm khoảng cách phân cách tại giao cắt khu vực Cầu Rồng sau 35 giây.',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metrics: { estimated_time_to_conflict_s: 35 },
        },
        {
          alert_id: `ALT-${Date.now()}-3`,
          severity: 'INFO',
          source: 'WEATHER_WARNING',
          title: 'Cập nhật gió tầng thấp ven biển',
          description: 'Gió giật cục bộ 12.5 m/s tại bờ biển Non Nước - Ngũ Hành Sơn.',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        },
      ];

      const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
      this.callbacks.onMessage({
        type: 'monitoring.alert',
        payload: randomAlert,
      });
    }, 22000);
  }
}
