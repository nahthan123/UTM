# SkyPermit UTM

Xem [c?y th? m?c, ??i chi?u Excel v? h??ng d?n demo](docs/implementation.md). Ph?m vi hi?n t?i l? n?m b?ng UTM ch?nh; m? ph?ng v? k?t n?i ph?n m?m ngo?i l? ??t t?ch h?p ri?ng.

Cổng Spring Boot đăng ký người vận hành, hồ sơ UAV và kế hoạch bay 4D. Cấu trúc giữ theo bản Git `58a662c`: `controller`, `dto/request`, `dto/response`, `model`, `repository`, `service`, `common/enums`, `exception`.

Thiết kế tham chiếu: [Phân tích các bảng dữ liệu UTM](<../Phân tích các bảng dữ liệu_UTM.xlsx>), phần 5 bảng chính. Các sheet mẫu sinh viên và phân quyền mở rộng không thuộc phạm vi bản này.

## Mô hình dữ liệu

| Bảng | Entity | Liên kết |
| --- | --- | --- |
| `roles` | `Role` | Vai trò ADMIN, MANAGER, OPERATOR và vai trò tùy chỉnh |
| `users` | `UserAccount` | Một người dùng có một `role_id`, hỗ trợ tài khoản cá nhân và doanh nghiệp |
| `drones` | `Drone` | `owner_id` trỏ tới người dùng |
| `flight_plans` | `FlightPlan` | `drone_id` và `operator_id` |
| `system_logs` | `SystemLog` | `user_id` có thể null nếu do hệ thống |

Khóa chính/FK dùng UUID (`UNIQUEIDENTIFIER` trên SQL Server). `BaseEntity` là lớp dùng chung, không tạo thêm bảng: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`, `is_active`.

`trajectory_json` và `details` là chuỗi text Unicode, ánh xạ thành `NVARCHAR(MAX)` trên SQL Server. Không dùng cột JSON. Thời gian bay dùng `DATETIME2`, trạng thái dùng chuỗi enum. `users` bổ sung `is_locked` và `login_fail_count` để đáp ứng endpoint khóa/mở khóa trong Excel. `action_type` dùng mã chuỗi vì tài liệu chưa liệt kê các giá trị enum cụ thể.

Model cũ `company_profiles`, `user_accounts`, `flight_requests` và API công ty/mô phỏng đã được thay bằng mô hình mới. Bản này không tự di chuyển dữ liệu cũ. H2 dùng file mới `data/utm-v2-db`; file `data/utm-flight-db` cũ được giữ nguyên.

## Chạy cục bộ

Cần Java 21 trở lên. Maven Wrapper có sẵn:

```powershell
.\mvnw.cmd spring-boot:run
```

Mở `http://localhost:8080`. Mặc định dùng H2 để chạy thử, không cần cấu hình SQL Server.

Đăng ký tài khoản mới nhận vai trò OPERATOR, đăng nhập bằng **username**. Web hỗ trợ quản lý drone, nhập/xóa waypoint, nộp/hủy kế hoạch, xem quỹ đạo và phân trang. ADMIN có giao diện quản lý người dùng/vai trò và nhật ký; MANAGER có thể xem người dùng, nhật ký và duyệt kế hoạch.

Form đăng ký có hai lựa chọn Cá nhân và Doanh nghiệp. Cá nhân cần họ tên. Doanh nghiệp cần tên công ty, mã số thuế, người đại diện và địa chỉ, có thể nhập thêm giấy phép khai thác. Thông tin liên hệ và tài khoản đăng nhập dùng chung cho hai loại. Thông tin doanh nghiệp lưu trong `users` qua `account_type`, `company_name`, `tax_code`, `representative`, `address`, `license_number`. `national_id` là trường tùy chọn cho cá nhân. Mã số thuế đã đăng ký được giữ duy nhất, kể cả với tài khoản xóa mềm.

Để tạo ADMIN đầu tiên, đặt hai biến môi trường trước khi chạy. Không có tài khoản hay mật khẩu quản trị mặc định:

```powershell
$env:UTM_BOOTSTRAP_USERNAME = 'admin'
$env:UTM_BOOTSTRAP_PASSWORD = '<mat-khau-rieng-tu-12-ky-tu>'
.\mvnw.cmd spring-boot:run
```

Bootstrap chỉ tạo nếu username chưa tồn tại, không ghi đè tài khoản hiện có. Bỏ hai biến sau lần khởi tạo. Mật khẩu băm BCrypt, giới hạn 72 byte UTF-8. Sai mật khẩu 5 lần sẽ khóa tài khoản; ADMIN mở khóa và reset bộ đếm. Cookie phiên HttpOnly, SameSite=Lax. Tài khoản bị khóa/xóa mềm hoặc có role ngừng hiệu lực sẽ không sử dụng được phiên cũ.

## SQL Server

1. Tạo database rỗng, ví dụ `utm`.
2. Chạy một lần [db/sqlserver-schema.sql](src/main/resources/db/sqlserver-schema.sql) trong database đó.
3. Cấu hình kết nối rồi chạy profile `sqlserver`:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'sqlserver'
$env:UTM_DB_URL = 'jdbc:sqlserver://localhost:1433;databaseName=utm;encrypt=true;trustServerCertificate=false'
$env:UTM_DB_USERNAME = '<database-user>'
$env:UTM_DB_PASSWORD = '<database-password>'
.\mvnw.cmd spring-boot:run
```

Profile SQL Server dùng `ddl-auto=validate` để kiểm tra schema, không tự sửa bảng đang có. Kết nối mặc định yêu cầu chứng chỉ máy chủ hợp lệ; môi trường thử nghiệm dùng chứng chỉ tự ký có thể đặt `trustServerCertificate=true` trong URL riêng của môi trường đó. Script tạo bảng mới không phải migration cho DB cũ. Driver JDBC đã được khai báo trong `pom.xml`.

Nếu đã tạo schema 5 bảng trước khi bổ sung đăng ký doanh nghiệp, chạy [sqlserver-business-registration.sql](src/main/resources/db/sqlserver-business-registration.sql) trước khi khởi động bản mới. Script thêm các cột hồ sơ và chỉ mục mã số thuế, gán loại INDIVIDUAL cho tài khoản hiện có. Với H2 mặc định, Hibernate cập nhật thêm cột khi khởi động.

## API

Mọi endpoint nghiệp vụ yêu cầu cookie phiên từ `/api/auth/login` hoặc `/api/auth/register`. Request và response dùng camelCase; tên cột SQL dùng snake_case. Danh sách trả về:

```json
{"content":[],"page":0,"size":10,"totalElements":0,"totalPages":0}
```

Hỗ trợ `page=0`, `size=10` (1–100), `sort=created_at,asc`; mặc định mới nhất trước. Nhận cả tên trường camelCase tương ứng. `isActive=true` là mặc định; `isActive=false` lấy bản ghi ngừng hiệu lực/xóa mềm. Không trả `passwordHash`, kể cả trong người dùng lồng trong drone/flight/log.

| Nhóm | Endpoint |
| --- | --- |
| Xác thực | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Người dùng | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` |
| Tìm/lọc người dùng | `GET /api/users?keyword=...&isActive=true&isLocked=false` |
| Khóa/mở khóa | `PUT /api/users/{id}/lock`, `PUT /api/users/{id}/unlock` |
| Vai trò | `GET/POST /api/roles`, `GET/PUT/DELETE /api/roles/{id}`, `PUT /api/roles/{id}/restore` |
| Drone | `GET/POST /api/drones`, `GET/PUT/DELETE /api/drones/{id}`, `PUT /api/drones/{id}/restore` |
| Tra cứu drone | `GET /api/drones/owner/{ownerId}`, `GET /api/drones/search?serialNumber=...` |
| Kế hoạch bay | `GET/POST /api/flights`, `GET /api/flights/{id}` |
| Trạng thái/hủy/khôi phục | `PUT /api/flights/{id}/status`, `PUT /api/flights/{id}/cancel`, `PUT /api/flights/{id}/restore` |
| Tra cứu kế hoạch | `GET /api/flights/operator/{operatorId}`, `GET /api/flights/active-or-approved` |
| Nhật ký | `GET /api/logs`, `GET /api/logs/{id}`, `GET /api/logs/user/{userId}`, `GET /api/logs/action?type=...`, `DELETE /api/logs/clear` |

Quyền truy cập:

- OPERATOR chỉ xem/sửa drone và xem/hủy kế hoạch của mình. `ownerId` khi tạo drone có thể bỏ trống để dùng tài khoản đăng nhập. Khi sửa drone mà bỏ `ownerId`, chủ sở hữu được giữ nguyên.
- ADMIN/MANAGER xem toàn bộ drone/kế hoạch, cập nhật trạng thái, khôi phục kế hoạch và xem người dùng/nhật ký.
- ADMIN quản lý người dùng/vai trò, khóa/mở khóa, xóa mềm nhật ký. Không tự xóa/khóa/hạ quyền tài khoản đang dùng; không xóa vai trò hệ thống.
- Danh mục vai trò tùy chỉnh chỉ là dữ liệu; hiện các quyền nghiệp vụ dựa trên ba mã ADMIN/MANAGER/OPERATOR. Chưa triển khai bảng permissions ở sheet mở rộng.

Xóa mềm giữ dữ liệu và UUID; username, email, serial number, role code đã dùng vẫn được giữ duy nhất. Drone có kế hoạch chưa kết thúc không được xóa hoặc chuyển chủ. Các thay đổi nghiệp vụ tạo nhật ký cùng transaction; xóa nhật ký cũng là xóa mềm và để lại bản ghi `LOG_CLEAR`.

### Đăng ký và nộp quỹ đạo

`POST /api/auth/register`:

```json
{
  "username":"vuong.operator",
  "password":"<mat-khau-tu-8-ky-tu>",
  "fullName":"Nguyễn Văn Vương",
  "email":"vuong@example.vn",
  "phone":"0901234567"
}
```

`POST /api/flights` nhận `trajectoryJson` là **chuỗi JSON**. Web chuyển các waypoint thành chuỗi này trước khi gửi:

```json
{
  "droneId":"<UUID drone của người đăng nhập>",
  "startTime":"2027-01-01T09:00:00",
  "endTime":"2027-01-01T09:20:00",
  "trajectoryJson":"[{\"latitude\":10.8,\"longitude\":106.7,\"altitude\":60,\"time\":\"2027-01-01T09:00:00\"},{\"latitude\":10.81,\"longitude\":106.71,\"altitude\":60,\"time\":\"2027-01-01T09:20:00\"}]"
}
```

Thời gian response dùng ISO UTC có Z. Request có offset được chuẩn hóa UTC; request không offset luôn coi là UTC+7. Web nhập và hiển thị UTC+7. Xem [quy ước và migration một lần](docs/integration.md). Thời gian cất/hạ cánh phải ở tương lai; hạ cánh sau cất cánh, thời lượng không vượt khả năng drone. Quỹ đạo có 2–10000 điểm, latitude ±90, longitude ±180, altitude không âm, thời gian tăng dần và nằm trong khoảng bay. Cấu trúc waypoint là quy ước API của bản này vì Excel chỉ mô tả chung “mảng 4D Waypoints”.

Trạng thái: `PENDING → APPROVED → ACTIVE → COMPLETED`, hoặc `PENDING → REJECTED`. `PUT .../status` nhận `{"status":"APPROVED"}`. Người vận hành hủy PENDING/APPROVED trước giờ cất cánh bằng endpoint cancel; kết quả CANCELLED. Khôi phục kế hoạch chỉ bỏ trạng thái xóa mềm, không đổi trạng thái phê duyệt. Tài liệu không định nghĩa endpoint xóa kế hoạch nên không thêm API xóa mới.

## Kiểm thử

```powershell
.\mvnw.cmd clean test
```

Kiểm thử tích hợp dùng H2 trong bộ nhớ, bao phủ UUID, tài khoản OPERATOR, quyền sở hữu, lưu nguyên chuỗi quỹ đạo, phê duyệt/hủy, xóa mềm/khôi phục, validation, phân trang, khóa/mở khóa và nhật ký. SQL Server cần kiểm tra kết nối/schema trên máy chủ đích trước khi dùng dữ liệu thật.
