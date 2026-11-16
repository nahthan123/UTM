# TASK 12: ĐẶC TẢ GIAO THỨC KẾT NỐI VÀ HỢP ĐỒNG DỮ LIỆU LIÊN THÀNH PHẦN (PART 4 – PART 5 – PART 2)

## 1. Danh sách 12 Bản tin Chuẩn hóa

Hệ thống định nghĩa tường minh 12 bản tin liên thành phần:

| STT | Tên bản tin | Nguồn gửi | Bên nhận | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `uav.telemetry` | Part 2 (Phước) | Part 4 (Giám sát) | Dòng telemetry vị trí, vận tốc, pin, mốc độ cao (ASTM F3411) |
| 2 | `flight_plan.update` | Part 3 (Huy) | Part 4 & Part 5 | Kế hoạch bay 4D đã phê duyệt (danh sách waypoint, thời gian) |
| 3 | `environment.update` | Part 2 (Phước) | Part 4 & Part 5 | Tốc độ gió, thời tiết, cập nhật động vùng hạn chế (zone.update) |
| 4 | `simulation.status` | Part 2 (Phước) | Part 4 & Part 5 | Trạng thái mô phỏng (RUNNING, PAUSED), tốc độ tua, giờ sim |
| 5 | `monitoring.alert` | Part 4 | Operator UI | Cảnh báo mất gói, trễ link, lệch hành lang 4D, vi phạm độ cao |
| 6 | `tactical.conflict.detected` | Part 5 Engine | Part 4 UI & Log | Thông báo phát hiện nguy cơ xung đột 3D (CPA, khoảng cách, UAVs) |
| 7 | `tactical.resolution.proposed`| Part 5 Engine | Part 4 UI | Danh sách phương án né tránh ứng viên kèm điểm số AI |
| 8 | `tactical.resolution.approved`| Part 4 UI | Part 5 Engine | Xác nhận phê duyệt phương án từ Người vận hành (Operator) |
| 9 | `tactical.command.request` | Part 5 Engine | Part 2 (Phước) | Lệnh điều chỉnh quỹ đạo chiến thuật (độ cao, tốc độ, hướng bay) |
| 10 | `tactical.command.ack` | Part 2 (Phước) | Part 5 Engine | Phản hồi nhận lệnh từ simulator (ACCEPTED / REJECTED) |
| 11 | `tactical.command.status` | Part 2 (Phước) | Part 5 Engine | Tiến độ thực hiện lệnh né tránh trong thế giới mô phỏng |
| 12 | `tactical.resolution.report` | Part 5 Engine | Lưu trữ / Audit | Báo cáo chi tiết sự cố xung đột xuất dạng JSON và CSV |

---

## 2. Đặc tả Chi tiết các Bản tin Trọng yếu

### 2.1. `tactical.conflict.detected`
```json
{
  "schema_version": "1.0.0",
  "message_id": "MSG-CONF-20261019-001",
  "source": "PART5_TACTICAL_ENGINE",
  "destination": "PART4_MONITORING_UI",
  "timestamp": "2026-10-19T02:45:00.120Z",
  "payload": {
    "conflict_id": "CONF-UAV-01-UAV-02-18",
    "uav_a_id": "UAV-01",
    "uav_b_id": "UAV-02",
    "severity": "CRITICAL",
    "time_to_cpa_seconds": 18.2,
    "cpa_timestamp": "2026-10-19T02:45:18.320Z",
    "cpa_horizontal_distance_m": 18.4,
    "cpa_vertical_distance_m": 4.0,
    "cpa_3d_distance_m": 18.8,
    "uav_a_position_at_cpa": {
      "latitude": 16.054210,
      "longitude": 108.204550,
      "altitude_m": 125.0,
      "altitude_reference": "AGL"
    },
    "uav_b_position_at_cpa": {
      "latitude": 16.054320,
      "longitude": 108.204680,
      "altitude_m": 121.0,
      "altitude_reference": "AGL"
    },
    "data_confidence": "HIGH",
    "requires_altitude_alignment": false,
    "description": "Dự báo vi phạm phân cách CPA = 18.4m (< 50m) tại t+18.2s"
  }
}
```

### 2.2. `tactical.command.request`
```json
{
  "schema_version": "1.0.0",
  "message_id": "MSG-CMD-8831",
  "source": "PART5_TACTICAL_ENGINE",
  "destination": "PART2_SIMULATOR",
  "target_uav_id": "UAV-01",
  "timestamp": "2026-10-19T02:45:05.000Z",
  "payload": {
    "command_id": "CMD-TAC-7A9B3F01",
    "action_type": "ALTITUDE_CHANGE",
    "target_altitude_m": 155.0,
    "altitude_delta_m": 30.0,
    "target_ground_speed_mps": null,
    "target_heading_deg": null,
    "execution_duration_s": 8.0,
    "reason": "TACTICAL_AVOIDANCE_COLLISION"
  }
}
```

### 2.3. `tactical.command.ack`
```json
{
  "schema_version": "1.0.0",
  "message_id": "MSG-ACK-8831",
  "source": "PART2_SIMULATOR",
  "destination": "PART5_TACTICAL_ENGINE",
  "timestamp": "2026-10-19T02:45:05.250Z",
  "payload": {
    "command_id": "CMD-TAC-7A9B3F01",
    "status": "ACCEPTED",
    "estimated_start_time": "2026-10-19T02:45:05.300Z",
    "estimated_completion_time": "2026-10-19T02:45:13.300Z",
    "error_code": null,
    "details": "Lệnh hợp lệ, UAV bắt đầu cơ động leo cao"
  }
}
```

---

## 3. Kiến trúc API và WebSocket Giữa các Khối

1. **Task 10 (Part 4) $\to$ Task 11 (Part 5)**:
   - Endpoint: `POST http://127.0.0.1:8000/api/tactical/feed`
   - Chu kỳ: Phát snapshot ngay khi có gói tin telemetry hợp lệ hoặc khi tick kiểm tra liveness (1 Hz).
2. **Task 11 (Part 5) $\to$ React UI (Part 4)**:
   - WebSocket: `ws://127.0.0.1:8000/api/tactical/ws`
   - Phát sự kiện cập nhật xung đột, phiên xử lý và xác nhận trạng thái phê duyệt.
3. **Task 11 (Part 5) $\to$ Part 2 (Phước)**:
   - Giao tiếp qua `MockExecutionAdapter` (môi trường kiểm thử độc lập) hoặc `LiveExecutionAdapter` (môi trường WebSocket thực tế của Phước).

---

## 4. Giả định Bảo mật (Security Assumptions)

Trong phạm vi đề tài nghiên cứu đồ án, hệ thống thiết lập các giả định an toàn thông tin cơ bản:
1. **Xác thực kênh truyền**: Kết nối WebSocket và REST được giả định nằm trong mạng nội bộ UTM phân vùng tin cậy (VPN / LAN kín). Khi triển khai thực địa, giao thức nâng cấp lên WSS / HTTPS với TLS 1.3.
2. **Phân quyền vai trò (RBAC)**:
   - `OPERATOR`: Có quyền xem trạng thái, duyệt (`Approve`) hoặc từ chối (`Reject`) phương án chiến thuật.
   - `OBSERVER`: Chỉ có quyền xem 3D và đọc dữ liệu, không có quyền can thiệp lệnh.
   - `SYSTEM_AI`: Chỉ có quyền tính toán, đề xuất và xếp hạng; tuyệt đối không có quyền tự kích hoạt gửi lệnh nếu không có chữ ký của Operator.
3. **Tính toàn vẹn dữ liệu (Data Integrity)**: Mỗi bản tin đều có `message_id`, `timestamp` và `schema_version`. Các gói tin lệch quá thời gian trễ cho phép sẽ bị đánh dấu `DEGRADED` hoặc `STALE`.
