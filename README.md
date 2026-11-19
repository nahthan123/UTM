# SkyPermit UTM

Website quản lý người vận hành, UAV và kế hoạch bay 4D phục vụ đề tài UTM.
Hướng dẫn này dùng **SQL Server chạy bên ngoài ứng dụng**, quản lý database bằng
**SQL Server Management Studio (SSMS)** và cấu hình trong file `.properties`.
Không cần tạo file `.env` hoặc thiết lập biến môi trường.

## 1. Chuẩn bị

- JDK 21 trở lên, lệnh `java -version` nhận đúng Java đã cài.
- SQL Server Database Engine, ví dụ instance `SQLEXPRESS` trên máy cá nhân.
- SSMS để tạo database, chạy script SQL và xem dữ liệu.
- SQL Server đã bật TCP/IP và cho phép tài khoản SQL Authentication đăng nhập.

SSMS là công cụ quản trị. Dữ liệu được lưu trong SQL Server, không nằm trong
file database H2 của dự án khi sử dụng profile `sqlserver`.
Maven Wrapper đã có sẵn, không cần cài Maven riêng.

## 2. Tạo database bằng SSMS

Mở SSMS, kết nối đến SQL Server:

| Mục | Ví dụ |
| --- | --- |
| Server type | Database Engine |
| Server name | `.\SQLEXPRESS` hoặc `localhost\SQLEXPRESS` |
| Authentication | SQL Server Authentication, hoặc Windows Authentication để quản trị |
| Database của ứng dụng | `utm` |

Với lần cài đặt mới, mở **New Query** và tạo database:

```sql
CREATE DATABASE utm;
GO
USE utm;
GO
```

Chọn database `utm`, mở và chạy một lần file
[sqlserver-schema.sql](src/main/resources/db/sqlserver-schema.sql).
Script tạo các bảng nghiệp vụ, bảng bàn giao tích hợp và bảng đánh dấu migration.
Tài khoản ứng dụng cấu hình ở bước tiếp theo phải có quyền truy cập database này.
Tài khoản Windows dùng để mở SSMS không tự trở thành tài khoản JDBC của ứng dụng.

**Nếu database đã có dữ liệu:** không chạy lại script tạo schema mới. Bản hiện tại
áp dụng các script bổ sung loại UAV và tích hợp trong lúc khởi động. Với database
cũ chưa có các cột hồ sơ doanh nghiệp, xem thêm
[sqlserver-business-registration.sql](src/main/resources/db/sqlserver-business-registration.sql).
Quy trình nâng cấp và chuyển đổi giờ UTC được ghi trong
[tài liệu tích hợp](docs/integration.md).

## 3. Cấu hình bằng file properties

Tạo hoặc cập nhật `application-local.properties` tại thư mục gốc dự án,
cùng cấp với `pom.xml` và `mvnw.cmd`:

```properties
spring.profiles.active=sqlserver

UTM_DB_URL=jdbc:sqlserver://localhost;instanceName=SQLEXPRESS;databaseName=utm;encrypt=true;trustServerCertificate=true
UTM_DB_USERNAME=ten_dang_nhap_sql
UTM_DB_PASSWORD=mat_khau_sql_cua_ban

utm.integration.mode=mock
```

Thay tên đăng nhập và mật khẩu bằng tài khoản SQL Server của bạn.
Các khóa `UTM_DB_URL`, `UTM_DB_USERNAME`, `UTM_DB_PASSWORD` ở trên là **thuộc tính
đọc từ file**, được profile SQL Server sử dụng; không phải thao tác khai báo biến
môi trường. File này đã được loại khỏi Git qua `.gitignore`.

Tên server `.\SQLEXPRESS` trong SSMS tương ứng với `localhost` và
`instanceName=SQLEXPRESS` trong JDBC URL. Không nhập nguyên `.\SQLEXPRESS` vào
vị trí tên host trong URL mẫu. `trustServerCertificate=true` trong ví dụ dùng
cho SQL Server cục bộ với chứng chỉ tự ký.

Nếu SQL Server dùng cổng TCP cố định, có thể thay riêng dòng URL bằng:

```properties
UTM_DB_URL=jdbc:sqlserver://localhost:1433;databaseName=utm;encrypt=true;trustServerCertificate=true
```

Thay `1433` bằng cổng thực tế của SQL Server. Khi kết nối theo tên instance,
cần SQL Server Browser hoạt động hoặc chuyển sang URL dùng cổng TCP cố định.

## 4. Tạo ADMIN đầu tiên

Thêm tạm hai dòng sau vào cùng file `application-local.properties`:

```properties
utm.bootstrap.username=admin
utm.bootstrap.password=thay_bang_mat_khau_rieng_tu_12_ky_tu
```

Sau lần khởi động tạo ADMIN thành công, xóa hai dòng bootstrap này khỏi file.
Không có tài khoản quản trị mặc định. Bootstrap chỉ tạo username chưa tồn tại,
không đổi mật khẩu hoặc vai trò của tài khoản đã có. Vì vậy, chọn username chưa
đăng ký nếu cần khởi tạo ADMIN mới.

## 5. Chạy trên Windows

Mở PowerShell tại thư mục gốc dự án rồi chạy:

```powershell
.\mvnw.cmd spring-boot:run
```

Truy cập **http://localhost:8080**. Dừng ứng dụng bằng `Ctrl+C`.
Không cần chạy database bằng Maven; SQL Server là dịch vụ riêng và phải hoạt động
trước khi khởi động website. Có thể mở SSMS đồng thời để xem các bảng trong `utm`.

Ứng dụng đọc `application-local.properties` theo thư mục đang chạy. Nếu mở bằng
IDE, đặt working directory về thư mục gốc dự án. Thiếu cấu hình profile `sqlserver`
thì cấu hình nền vẫn có thể dùng H2; để làm việc với database trong SSMS, giữ dòng
`spring.profiles.active=sqlserver` như ví dụ.

Profile SQL Server dùng `ddl-auto=validate`. Bộ khởi tạo riêng của dự án vẫn chạy
migration bổ sung trước bước validate; tài khoản khởi động cần quyền ALTER/CREATE
cho những thay đổi này hoặc quản trị viên áp dụng script trước.

## 6. Chức năng và phân quyền

| Vai trò | Chức năng |
| --- | --- |
| OPERATOR | Đăng ký cá nhân/doanh nghiệp, quản lý UAV của mình, nộp/hủy kế hoạch, xem kết quả và tải lộ trình đã duyệt |
| MANAGER | Xem dữ liệu toàn hệ thống, theo dõi kế hoạch, cập nhật Đang bay/Hoàn thành, xem nhật ký và tích hợp |
| ADMIN | Các quyền quản lý; duyệt/từ chối kế hoạch, quản lý người dùng/vai trò, khóa/mở khóa và gửi lại bản tin tích hợp |

Đăng ký công khai luôn nhận OPERATOR. ADMIN tạo hoặc gán MANAGER và các vai trò
khác trong trang Người dùng. Vai trò tùy chỉnh hiện là danh mục, chưa có cơ chế
cấp quyền nghiệp vụ động.

Luồng sử dụng:

1. Đăng ký hoặc đăng nhập bằng username.
2. Khai báo UAV: Multirotor, Fixed-wing hoặc Hybrid VTOL; nhập thông số phương tiện.
3. Chọn UAV, nhập điểm đi/đến, giờ cất/hạ cánh và các waypoint 4D.
4. Gửi kế hoạch để ADMIN duyệt hoặc từ chối kèm ghi chú.
5. User xem kết quả và tải JSON lộ trình đã duyệt; hệ thống tạo bản tin bàn giao.

Một đợt gửi có tối đa **50 UAV**, mỗi UAV một kế hoạch và được duyệt riêng, dùng
chung mã đợt `submissionId`. Độ cao kế hoạch mới từ **0–120 m AGL**, là tham số
mô phỏng của đề tài. Thời gian waypoint đầu/cuối phải khớp giờ cất/hạ cánh, thời
lượng không vượt khả năng UAV. Không cho một UAV có hai kế hoạch đang mở trùng giờ.

Trạng thái chính: `PENDING → APPROVED → ACTIVE → COMPLETED`.
Có nhánh `PENDING → REJECTED`; operator có thể hủy PENDING/APPROVED trước cất cánh.
Giờ nhập/hiển thị trên web là UTC+7; API trả UTC. Kế hoạch cũ giữ mốc độ cao AMSL.

## 7. Chuẩn bị tích hợp mock

Chọn chế độ ngay trong `application-local.properties`:

```properties
utm.integration.mode=mock
```

- `mock`: lưu bản tin cho hai đích SIMULATION/MONITORING và phản hồi `MOCK_DELIVERED`.
- `disabled`: lưu bản tin PENDING, chưa tiếp nhận giả lập.

Sau khi đổi cấu hình, khởi động lại ứng dụng. Tab **Tích hợp** cho phép
ADMIN/MANAGER xem bản tin; ADMIN có thể gửi lại bản tin đang chờ hoặc bị lỗi.

Các sự kiện gồm `flightplan.accepted`, `flightplan.cancelled` và
`flightplan.status.changed`. Mock chỉ ghi nhận dữ liệu cục bộ, **chưa chạy
SITL/Gazebo, giám sát CesiumJS hoặc kiểm tra xung đột không gian bằng AI**.

## 8. Dữ liệu và API

Các bảng nghiệp vụ: `roles`, `users`, `drones`, `flight_plans`, `system_logs`,
`integration_deliveries`. Bảng `utm_migrations` ghi nhận migration.
Khóa chính dùng UUID; thao tác xóa nghiệp vụ là xóa mềm.

| Nhóm | API chính |
| --- | --- |
| Xác thực | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| Người dùng và vai trò | `/api/users`, `/api/roles` |
| Phương tiện | `/api/drones` |
| Kế hoạch | `/api/flights`, `POST /api/flights/batch` |
| Xét duyệt | `PUT /api/flights/{id}/status` |
| Lộ trình đã duyệt | `GET /api/flights/{id}/accepted-plan` |
| Bàn giao | `GET /api/flights/{id}/integration`, `GET /api/integrations` |
| Gửi lại bản tin | `POST /api/integrations/{id}/retry` |
| Nhật ký | `/api/logs` |

API nghiệp vụ yêu cầu cookie phiên đăng nhập và kiểm tra quyền trên server.
Chi tiết payload, phân trang và luồng tích hợp nằm trong các tài liệu bên dưới.

## 9. Tài liệu và trạng thái xác minh

- [Phân quyền](docs/access-control.md).
- [Tích hợp và nâng cấp database](docs/integration.md).
- [JSON Schema bản tin](docs/contracts/flightplan-event.schema.json).
- [Bản tin mẫu](docs/contracts/flightplan-accepted.example.json).
- [Cấu trúc và hướng dẫn demo](docs/implementation.md).
- [Những phần còn lại](docs/backlog.md).
- Tài liệu gốc của đề tài: thư mục `23_10/`.
- Nhật ký làm việc Word: thư mục `docs/work-logs/`.

Chạy toàn bộ kiểm thử tại thư mục gốc:

```powershell
.\mvnw.cmd test
```

Test dùng H2 riêng, bỏ qua `application-local.properties` và không kết nối SQL
Server đang dùng. Không cần đổi cấu hình database hoặc truyền profile qua lệnh.
Kết quả ngày 19/11/2026 sau khi cập nhật test và sửa cách nạp migration SQL Server:
**25 test đạt, 0 thất bại, 0 lỗi, 0 bỏ qua**. Hai test hồi quy kiểm tra cách gửi
script SQL Server thành một batch và cách tách câu lệnh H2 bằng JDBC giả lập.
Kết quả này chưa xác minh migration hoặc khởi động trên SQL Server thật.
