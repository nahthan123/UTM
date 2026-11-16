# TASK 13: KỊCH BẢN TÍCH HỢP VÀ KIỂM THỬ HỆ THỐNG (INTEGRATION SCENARIOS)

Hệ thống UTM Monitoring & Tactical Deconfliction được xây dựng với 4 kịch bản tích hợp có thể tái lập 100% để kiểm chứng toàn bộ luồng hoạt động từ giám sát 3D đến xử lý chiến thuật.

---

## 1. Kịch bản 1: Bay Bình thường (Nominal Normal Flight)

- **Mô tả**: 3 UAV (`UAV-001`, `UAV-002`, `UAV-003`) thực hiện bay theo các hành lang kế hoạch riêng biệt trên không phận Đà Nẵng.
- **Dữ liệu đầu vào**: Dòng telemetry từ `DemoDataSource` hoặc bản tin định dạng chuẩn của Phước.
- **Hành vi Part 4 (Task 10)**:
  - Hiển thị 3 UAV trên bản đồ 3D CesiumJS với nhãn độ cao (`m AGL` / `m MSL`).
  - Vệt bay thực tế (Trails) bám sát tuyến kế hoạch.
  - Bộ đồng bộ xác nhận dữ liệu tươi mới (`FRESH`, độ tin cậy `HIGH`).
  - `Part5ExportBridge` xuất snapshot sạch định kỳ.
- **Hành vi Part 5 (Task 11)**:
  - Tính toán 3D CPA giữa tất cả các cặp UAV $\binom{3}{2} = 3$ cặp.
  - Khoảng cách tiếp cận gần nhất luôn duy trì $> 400$m (vượt xa ngưỡng an toàn $50$m ngang, $15$m đứng).
  - **Kết quả**: Hệ thống **không phát cảnh báo giả**; trạng thái không phận báo "An toàn".

---

## 2. Kịch bản 2: Xung đột Trước bay (Pre-flight Strategic Conflict)

- **Mô tả**: Hai kế hoạch bay `PLAN-MED-01` và `PLAN-CARGO-02` có xung đột giao cắt tại cùng tọa độ và cùng thời điểm dự kiến (4D Waypoint Conflict).
- **Phân định ranh giới**:
  - Theo thiết kế đồ án, việc xử lý xung đột trước bay thuộc về **Phần 3 (thành viên Huy)**.
  - Do Huy chưa hoàn thành API chính thức, kịch bản này sử dụng **dữ liệu kế hoạch bay mẫu (Mock Data)** được chú thích rõ ràng:
    > *"ĐÂY LÀ DỮ LIỆU MINH HỌA XUNG ĐỘT KẾ HOẠCH MẪU, KHÔNG PHẢI KẾT QUẢ TÍCH HỢP PHẦN 3 THẬT."*
- **Hành vi Part 4**:
  - Thể hiện 2 tuyến đường bay dự kiến giao cắt nhau bằng đường nét đứt vàng/cam trên bản đồ 3D.
  - Cảnh báo lệch kế hoạch được giữ ở mức theo dõi chiến lược, không kích hoạt quy trình can thiệp chiến thuật nếu các UAV chưa cất cánh hoặc chưa vi phạm phân cách vật lý thực tế.

---

## 3. Kịch bản 3: Xung đột Chiến thuật do Thời tiết / Gió thay đổi (Dynamic Tactical Conflict)

- **Mô tả**:
  - Gió giật đổi hướng trong mô phỏng khiến UAV thay đổi quỹ đạo bay thực tế.
  - `UAV-01` (Multirotor) và `UAV-02` (Fixed-wing) bay đối đầu hoặc hội tụ tại cùng cao độ $125$m với vận tốc $15$ m/s.
- **Luồng xử lý hoàn chỉnh (End-to-End Pipeline)**:
  1. **Task 10 Phát hiện**: Telemetry thực nhận cho thấy khoảng cách thu hẹp. `Part5ExportBridge` chuyển gói tin sang Task 11.
  2. **Task 11 Phân tích**: `ConflictDetector` tính toán:
     - CPA Ngang: $18.4$ m ($< 50$ m threshold)
     - CPA Đứng: $4.0$ m ($< 15$ m threshold)
     - Thời gian tới CPA: $18.2$ s ($< 20$ s $\to$ mức độ `CRITICAL`)
  3. **Sinh & Kiểm tra Phương án**:
     - `ResolutionGenerator` sinh 8 phương án ứng viên (leo cao, hạ cao, đổi hướng, đổi tốc độ).
     - `ResolutionValidator` lọc qua 7 tiêu chí ràng buộc: loại bỏ phương án hạ cao vì chạm sàn địa hình, loại bỏ phương án giảm tốc của Fixed-wing vì chạm ngưỡng stall speed $12$ m/s, loại bỏ phương án leo cao chạm vùng NFZ.
     - Phương án tối ưu còn lại: **UAV-01 leo cao $+30$m lên $155$m AGL**.
  4. **AI Xếp hạng (Tier B)**:
     - Đạt điểm số $91.5/100$ nhờ độ an toàn cao, động lực học Multirotor leo cao êm ái, bảo toàn 4D plan.
  5. **Người vận hành Phê duyệt**:
     - Giao diện bật bảng Chiến thuật, người vận hành bấm **"Xem trước 3D"** (quỹ đạo xanh ngọc hiển thị trên Cesium).
     - Bấm **"Duyệt"** (Approve).
  6. **Gửi lệnh & Thực hiện**:
     - State machine chuyển: `APPROVED` $\to$ `SENT` $\to$ `ACCEPTED` $\to$ `EXECUTING`.
     - `MockExecutionAdapter` trả mã lệnh `CMD-TAC-xxxx`.
  7. **Xác minh qua Telemetry Mới (Verification)**:
     - Dòng telemetry tiếp theo báo `UAV-01` đã đạt cao độ $155$m AGL.
     - CPA mới đạt $88.6$m ngang, $30$m đứng $\to$ Phân cách an toàn đã phục hồi!
     - Hệ thống chuyển trạng thái sang **`VERIFIED`**.
     - Xuất báo cáo sự cố định dạng JSON và CSV.

---

## 4. Kịch bản 4: Chuyển đổi Nguồn Dữ liệu (Data Source Swapping)

- **Mô tả**: Kiểm chứng tính độc lập và tính nhất quán của hợp đồng dữ liệu khi thay đổi giữa 3 nguồn dữ liệu:
  1. `DemoDataSource` (bộ tạo dữ liệu mẫu nội bộ).
  2. `Phuoc JSON Replay` (nhập tệp JSON thực tế từ bộ mô phỏng của Phước).
  3. `LiveWebSocketDataSource` (kết nối trực tiếp luồng WebSocket bên ngoài).
- **Kết quả kiểm chứng**:
  - Cả 3 nguồn phát đều đi qua cùng một pipeline:
    $$\text{DataSource} \to \text{PhuocAdapter} \to \text{Validator} \to \text{Synchronizer} \to \text{Part5Bridge} \to \text{TacticalEngine}$$
  - Không có bất kỳ thành phần nào của lõi giám sát hay xử lý chiến thuật bị phụ thuộc cứng vào nguồn phát dữ liệu.

---

## 5. Bảng Phân định Trạng thái Tích hợp Thực tế

| Thành phần | Trạng thái Hiện tại | Ghi chú & Ranh giới Kỹ thuật |
| :--- | :--- | :--- |
| **Giám sát 3D Đà Nẵng (Task 10)** | **HOÀN THÀNH (CHẠY THỰC TẾ)** | Bản đồ Cesium 3D, NFZ, vệt bay, demo/live, import JSON Phước |
| **Xử lý Xung đột Chiến thuật (Task 11)**| **HOÀN THÀNH (CHẠY THỰC TẾ)** | FastAPI backend, 3D CPA, 7 ràng buộc, AI ranker, 16 pytest tests |
| **Giao diện Chiến thuật trên Web** | **HOÀN THÀNH (CHẠY THỰC TẾ)** | Panel xử lý, xem trước 3D, duyệt/từ chối, chuyển AI ON/OFF |
| **Hợp đồng dữ liệu & Báo cáo (Task 12)**| **HOÀN THÀNH (CHẠY THỰC TẾ)** | 12 bản tin chuẩn, xuất báo cáo JSON / CSV |
| **Bộ chuyển đổi phản hồi lệnh** | **SỬ DỤNG MOCK ADAPTER** | Đã sẵn sàng interface LiveExecutionAdapter để cắm vào API của Phước khi hoàn thiện |
| **Tích hợp Kế hoạch bay (Part 3)** | **CHỜ TÍCH HỢP (DÙNG DỮ LIỆU MẪU)**| Huy chưa hoàn thành API lập kế hoạch bay chiến lược |
| **Tích hợp WebSocket Thực (Part 2)** | **CHỜ PHƯỚC TRIỂN KHAI WS THỰC** | Phước mới cung cấp mẫu JSON tĩnh, chưa chạy server WebSocket trực tiếp |
