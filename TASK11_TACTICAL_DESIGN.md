# TASK 11: THIẾT KẾ KIẾN TRÚC MÔ-ĐUN XỬ LÝ XUNG ĐỘT CHIẾN THUẬT (PART 5)

## 1. Sơ đồ Kiến trúc Tổng thể Task 10 – Task 11

```
+-----------------------------------------------------------------------------------+
|                        TASK 10: UTM MONITORING (REACT + TS)                      |
|                                                                                   |
|  [Phuoc Simulator / Demo / WS] ---> [Validator & Sync] ---> [ObservedUAVState]     |
|                                                                    |              |
|                                                          [Part5ExportBridge]       |
+--------------------------------------------------------------------+--------------+
                                                                     |
                                           REST POST /feed & WS Stream
                                           (JSON Verified Snapshot)
                                                                     v
+-----------------------------------------------------------------------------------+
|               TASK 11: TACTICAL DECONFLICTION ENGINE (FASTAPI:8000)               |
|                                                                                   |
|   1. Conflict Detection:                                                          |
|      - Pairwise 3D CPA (Closest Point of Approach)                                |
|      - Geodesic math (WGS84 Tangent Plane + Haversine)                            |
|      - Geometric Crossing vs Temporal Conflict Separation                         |
|      - Strict Datum Validation: AGL vs MSL flag (no arbitrary mixing)             |
|                                                                                   |
|   2. Resolution Generation (Tier A Kinematic Core):                               |
|      - Altitude Change (+25m, +40m, -25m)                                          |
|      - Speed Change (+5 m/s, -5 m/s)                                              |
|      - Heading Change (+30 deg, -30 deg)                                          |
|      - Compound Maneuvers                                                         |
|                                                                                   |
|   3. Multi-Constraint Validation (7 Safety Criteria):                             |
|      [1] Primary Conflict Resolved? (Separation >= 50m H, >= 15m V)                |
|      [2] Secondary Conflict with 3rd UAV? (N >= 3 Check)                          |
|      [3] Penetrates Restricted Zone (NFZ)?                                        |
|      [4] Within UAV Limits? (Multirotor vs Fixed-Wing Stall vs VTOL)              |
|      [5] Within 4D Plan Deviation Budget?                                         |
|      [6] Telemetry Freshness & Confidence Adequate? (No STALE/LOST)               |
|      [7] Feasibility Outcome -> If None: NO_FEASIBLE_SOLUTION                     |
|                                                                                   |
|   4. Tier B AI Scoring & Ranking Engine:                                          |
|      - Explainable Feature Attribution (Safety, Efficiency, Smoothness, Dynamic)  |
|      - Objective Benchmark vs Tier A Baseline Rules                               |
|                                                                                   |
|   5. Operational State Machine (11-Step Lifecycle):                               |
|      DETECTED -> ANALYZING -> PROPOSED -> VALIDATED -> PENDING_APPROVAL ->        |
|      APPROVED -> SENT -> ACCEPTED -> EXECUTING -> COMPLETED -> VERIFIED           |
|                                                                                   |
|   6. Execution Adapters & Reporting:                                              |
|      - MockExecutionAdapter (Isolated Feedback Loop)                              |
|      - LiveExecutionAdapter (Part 2 Phuoc WS/REST Interface)                      |
|      - Comprehensive Incident Reports (JSON & CSV Export)                         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Lưu đồ Xử lý Xung đột Chiến thuật (Deconfliction Flowchart)

```
        [Dữ liệu quan sát từ Task 10]
                      |
                      v
          [Kiểm tra độ tươi & tin cậy]
         /                            \
   (STALE / LOST)                  (FRESH)
         |                            |
[Hạn chế dự báo, gắn cờ]        [Tính toán 3D CPA]
                                      |
                     [CPA_H < 50m VÀ CPA_V < 15m VÀ T_CPA <= 60s?]
                                    /     \
                                  (Có)    (Không)
                                   |         \
                         [Xung đột phát hiện]  [Không phận an toàn]
                                   |
                     [Sinh các phương án ứng viên]
                                   |
                  [Bộ kiểm tra 7 ràng buộc an toàn]
                                   |
                     [Có phương án khả thi không?]
                                  /       \
                               (Có)       (Không)
                                |            \
                     [Xếp hạng AI / Cơ sở]  [Trạng thái NO_FEASIBLE_SOLUTION]
                                |                     |
                  [PENDING_APPROVAL: Chờ duyệt] [Duy trì cảnh báo khẩn cấp]
                                |
                     [Người vận hành quyết định]
                                /        \
                            (Duyệt)    (Từ chối)
                              |            \
                          [APPROVED]    [REJECTED]
                              |
                    [Gửi lệnh tới Adapter]
                              |
                      [Phần 2 phản hồi]
                             /        \
                        (Chấp nhận)  (Từ chối/Timeout)
                            |             \
                      [EXECUTING]     [FAILED / TIMEOUT]
                            |
           [Nhận telemetry mới từ Task 10]
                            |
                 [Phân cách >= 50m H?]
                        /        \
                     (Có)       (Chưa)
                      |            \
                 [VERIFIED]    [Tiếp tục theo dõi]
```

---

## 3. Quy tắc Ưu tiên và Xếp hạng Phương án (Tier A vs Tier B)

### Tầng A – Thuật toán cơ sở (Rule-based Baseline)
Sử dụng hàm mục tiêu tuyến tính minh bạch:
$$S_{baseline} = 0.60 \cdot R_{safety} + 0.40 \cdot E_{efficiency}$$
- $R_{safety}$: Biên độ an toàn dự kiến tại CPA sau điều chỉnh (vượt ngưỡng 50m/15m).
- $E_{efficiency}$: Tỷ lệ bảo toàn kế hoạch bay gốc ($1.0 - \text{Độ lệch chuẩn hóa}$).

### Tầng B – AI hỗ trợ xếp hạng (Feature-Weighted Scoring Model)
Mô hình học máy tích hợp 4 đặc trưng trọng số được hiệu chỉnh từ dữ liệu mô phỏng chiến thuật:
1. **Biên độ an toàn ($w = 0.45$)**: Điểm thưởng khi phân cách CPA vượt xa bán kính an toàn tối thiểu.
2. **Hiệu quả bay ($w = 0.25$)**: Giảm thiểu độ lệch cao độ, vận tốc và lộ trình so với kế hoạch ban đầu.
3. **Độ êm ái cơ động ($w = 0.15$)**: Ưu tiên điều chỉnh tốc độ hoặc đổi độ cao mượt mà thay vì chuyển hướng ngoặt đột ngột.
4. **Độ phù hợp khí động học ($w = 0.15$)**:
   - `MULTIROTOR`: Ưu tiên thay đổi độ cao hoặc giảm tốc độ hover.
   - `FIXED_WING`: Ưu tiên điều chỉnh hướng bay hoặc tốc độ hành trình; cấm giảm tốc dưới tốc độ thất tốc (stall speed $12$ m/s).
   - `VTOL`: Linh hoạt cả hai chế độ.

**Nguyên tắc bắt buộc**: Mọi đề xuất của AI đều phải vượt qua **Bộ kiểm tra 7 ràng buộc an toàn độc lập** trước khi đưa ra người vận hành. AI **không bao giờ** tự động gửi lệnh vượt quyền người vận hành.

---

## 4. Bảng So sánh Trạng thái Trước và Sau Xử lý

| Chỉ số | Trước xử lý (Dự báo CPA) | Sau xử lý (Phương án đã duyệt) | Xác minh Telemetry Thực tế |
| :--- | :--- | :--- | :--- |
| **Khoảng cách ngang** | $18.4$ m ($< 50$ m) | $94.2$ m ($> 50$ m) | $88.6$ m (Đạt chuẩn) |
| **Khoảng cách đứng** | $4.0$ m ($< 15$ m) | $34.0$ m ($> 15$ m) | $32.5$ m (Đạt chuẩn) |
| **Thời gian tới CPA** | $18.2$ s | Đã giải tỏa xung đột | Phân cách ổn định |
| **Trạng thái hệ thống** | `CRITICAL_CONFLICT` | `EXECUTING` | `VERIFIED` |
