# UTM OPS MVP

MVP điều hành UAV dành cho TV1: quản lý hồ sơ UAV, kế hoạch bay, phê duyệt trước bay, cảnh báo, lệnh và nhật ký.

## Chạy local

Mở `dist/index.html` trực tiếp trong trình duyệt hoặc chạy một static server tại thư mục dự án.

## Phạm vi MVP

- Dashboard vận hành và bản đồ mô phỏng
- Tạo, tìm kiếm, lọc, duyệt hoặc từ chối kế hoạch bay
- Chuyển kế hoạch đã duyệt sang trạng thái mô phỏng
- Hồ sơ và tình trạng đội UAV
- Cảnh báo, xử lý cảnh báo, phát lệnh điều hành
- Nhật ký bất biến trong phiên dữ liệu và xuất CSV
- Dữ liệu được lưu bằng `localStorage` của trình duyệt

## Bước tiếp theo

Thay lớp lưu `localStorage` bằng API/backend và CSDL; bổ sung xác thực, bản đồ GIS thật và hợp đồng bản tin tích hợp mô phỏng.
