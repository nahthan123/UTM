# Phạm vi web UTM và cấu trúc mã

Nguồn đối chiếu: sheet `Task1_Web đki thông tin bay` trong workbook
`Phân tích các bảng dữ liệu_UTM.xlsx`, vùng A12:I90.

## Cây thư mục

```text
src/main/java/vn/utm/
├── UtmApplication.java
├── common/                 # chuẩn hóa thời gian, trajectory
│   └── enums/              # AccountType, DroneType, FlightStatus
├── config/                 # Jackson UTC, khởi tạo DB/migration
├── controller/             # AuthController, UtmController
├── dto/
│   ├── request/            # request + Bean Validation
│   └── response/           # DTO bất biến, phân trang, không lộ mật khẩu
├── exception/              # lỗi JSON nhất quán
├── model/                  # BaseEntity + 5 entity nghiệp vụ
├── repository/             # JPA + Specification
└── service/                # xác thực, quyền, nghiệp vụ, truy vấn, seed, migration
src/main/resources/
├── application.properties
├── application-sqlserver.properties
├── db/                     # schema và script nâng cấp H2/SQL Server
└── static/                 # HTML, CSS, JS Fetch API
src/test/java/vn/utm/       # MockMvc, JPA, schema, migration, backup
scripts/browser-smoke.cjs   # luồng thật trên Edge headless với DB tạm
```

## Đối chiếu năm nhóm chính

| Vùng Excel | Đã triển khai |
| --- | --- |
| USERS A12:I29 | UUID; tên đăng nhập, vai trò, BCrypt, hồ sơ, audit, xóa mềm; tạo/sửa/xóa, chi tiết, tìm kiếm, lọc khóa, khóa/mở khóa, phân trang/sắp xếp |
| ROLES A31:I44 | Danh mục vai trò; tạo/sửa/xóa mềm/khôi phục, chi tiết; bảo vệ vai trò hệ thống |
| DRONES A46:I60 | Chủ sở hữu, số sê-ri duy nhất, model, thời gian tối đa phút, tốc độ m/s; tạo/sửa/xóa mềm/khôi phục, chi tiết, tra cứu chủ sở hữu/sê-ri, phân trang |
| FLIGHT_PLANS A62:I76 | UAV, người vận hành, giờ bay, waypoint 4D, đủ 6 trạng thái; nộp/duyệt/từ chối/hủy/khôi phục, chi tiết, lọc operator và APPROVED/ACTIVE, phân trang |
| SYSTEM_LOGS A78:I90 | Người thực hiện, mã hành động, chi tiết và audit; truy vấn danh sách/chi tiết/theo user/theo hành động, xóa mềm, phân trang |

Các mô tả chức năng ở I81:I85 của bảng nhật ký có nội dung sao chép từ kế hoạch
bay; triển khai theo tên bảng và endpoint ở H81:H85, không tạo kế hoạch khi đọc log.
`action_type` dùng chuỗi mã vì workbook không định nghĩa danh sách enum.

## Quyền và giao diện

Xem [ma trận quyền và hai khu vực giao diện](access-control.md). Tài khoản
quản lý vào hàng chờ phê duyệt, tài khoản OPERATOR vào khu vực đăng ký của mình.

- OPERATOR chỉ quản lý UAV và kế hoạch của mình; không thể tự cấp quyền bằng request.
- MANAGER xem dữ liệu vận hành, người dùng và nhật ký, duyệt/chuyển trạng thái bay.
- ADMIN có thêm quản trị người dùng, khóa/mở khóa, danh mục vai trò và xóa mềm log.
- Form UAV có dropdown ba loại theo yêu cầu bổ sung; model giữ là tên mẫu riêng.
  Loại cũ chưa biết giữ null để người vận hành khai báo đúng.
- Web có tìm kiếm, lọc hiệu lực, lọc khóa tài khoản, lọc kế hoạch đã duyệt/đang bay,
  sắp xếp ngày tạo và chọn 10/25/50/100 bản ghi mỗi trang.
- Thời gian nhập/hiển thị UTC+7, API UTC có Z. Quỹ đạo kiểm tra số điểm, tọa độ,
  độ cao, thời gian tăng dần và thời lượng phù hợp UAV.

## Chạy demo

Không có mật khẩu mặc định. Đặt Java 21+ và tạo admin lần đầu bằng biến môi trường:

```powershell
$env:UTM_BOOTSTRAP_USERNAME = 'admin'
$env:UTM_BOOTSTRAP_PASSWORD = Read-Host 'Mật khẩu admin riêng, ít nhất 12 ký tự'
.\mvnw.cmd spring-boot:run
```

Đăng ký OPERATOR trên web → khai báo UAV → nộp kế hoạch 4D → đăng nhập ADMIN,
tạo MANAGER → MANAGER duyệt, chuyển ACTIVE rồi COMPLETED → xem nhật ký.
Trạng thái hiện chuyển thủ công; không có kết nối mô phỏng ngoài hay telemetry thật.
Xóa các biến bootstrap khỏi phiên làm việc sau lần khởi tạo.

## Dữ liệu và giới hạn

- Mô hình mới dùng H2 `data/utm-v2-db`, giữ nguyên `data/utm-flight-db` cũ.
  Tài khoản của mô hình cũ không được tự chuyển; cần đăng ký lại/bootstrap admin.
- Schema tạo mới: `db/h2-schema.sql`, `db/sqlserver-schema.sql`. Với H2 mặc định,
  Hibernate tạo/cập nhật bảng; với SQL Server, tạo schema trước và dùng profile validate.
- Migration UTC và script bổ sung được mô tả trong `integration.md`; sao lưu trước
  khi nâng cấp DB đã có dữ liệu. SQL Server chưa được kiểm chứng trên server thật.
- Sheet `Demo` là ví dụ sinh viên. Sheet `Sheet1` mô tả phân quyền nhiều vai trò
  và quyền động, khác với `users.role_id` trong bảng USERS chính. Hai phần này
  không thuộc phạm vi năm bảng đã chọn; không tuyên bố triển khai các endpoint đó.
- Các API company/flight mô hình cũ của commit 58a662c được thay bằng API theo
  workbook; giao diện đã cập nhật đồng bộ. Mô phỏng nội bộ cũ không được gắn nhãn
  là kết nối phần mềm ngoài.
- Chưa triển khai API key, SSE, scheduler, OpenAPI, bản đồ hay kiểm tra tốc độ
  giữa waypoint; đây là đợt tích hợp riêng sau phần web năm bảng.

## Kiểm thử

```powershell
.\mvnw.cmd test
```

`scripts/browser-smoke.cjs` yêu cầu Playwright và Edge, biến `UTM_TEST_ADMIN`,
`UTM_TEST_PASSWORD`, và tùy chọn `UTM_TEST_URL` (mặc định localhost:18080).
Chỉ chạy với DB thử nghiệm dùng một lần. Script tạo người dùng/UAV/kế hoạch
kiểm thử; không dùng trên dữ liệu thật.
