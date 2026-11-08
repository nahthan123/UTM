# SkyPermit UTM

Ứng dụng Spring Boot đăng ký đơn vị bay cá nhân hoặc doanh nghiệp và chuyến bay UAV, sau đó gửi lệnh sang mô-đun mô phỏng và theo dõi telemetry.

## Chức năng

- Đăng ký tài khoản cá nhân hoặc doanh nghiệp.
- Đăng nhập, đăng xuất và duy trì phiên bằng cookie HttpOnly.
- Mật khẩu được băm bằng BCrypt; dữ liệu được phân tách theo từng tài khoản.
- Tự động tạo hồ sơ pháp lý đơn vị bay sau khi đăng ký.
- Khai báo điểm xuất phát, điểm đến, thời gian, độ cao và thời lượng bay.
- Hỗ trợ drone đa cánh quạt, cánh bằng và hybrid.
- Gửi lệnh bay đến bộ mô phỏng nội bộ.
- Giám sát độ cao, tốc độ, pin, tín hiệu và tiến độ hành trình.
- Lưu dữ liệu bằng H2 tại thư mục `data/`.

## Công nghệ

- Java 21, Spring Boot 3.5
- Spring Web, Spring Data JPA, Bean Validation
- H2 Database
- HTML, CSS và JavaScript thuần

## Chạy dự án

Yêu cầu Java 21+. Dự án đã kèm Maven Wrapper nên không cần cài Maven riêng.

```powershell
.\mvnw.cmd spring-boot:run
```

Mở `http://localhost:8080`.

## Kiểm thử

```powershell
.\mvnw.cmd test
```

Test tích hợp bao phủ đăng ký cá nhân/doanh nghiệp, đăng nhập/đăng xuất và luồng tạo chuyến bay → gửi mô phỏng → đọc telemetry.

## API chính

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/companies`
- `GET/POST /api/flights`
- `POST /api/flights/{id}/send`
- `GET /api/flights/{id}/monitoring`
