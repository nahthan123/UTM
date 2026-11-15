# Giao diện và quyền theo vai trò

Client nghiệp vụ là OPERATOR. ADMIN/MANAGER dùng khu vực xét duyệt riêng;
đăng nhập vẫn dùng một trang chung, giao diện điều hướng và nội dung thay đổi
theo vai trò được xác thực trên server.

| Thao tác | OPERATOR | MANAGER | ADMIN |
| --- | --- | --- | --- |
| Khai báo UAV mới | Của mình | Không | Không |
| Xem/sửa/xóa mềm/khôi phục UAV | Của mình | Toàn hệ thống | Toàn hệ thống |
| Nộp kế hoạch 4D | UAV của mình | Không | Không |
| Xem kế hoạch và quỹ đạo | Của mình | Toàn hệ thống | Toàn hệ thống |
| Hủy kế hoạch trước cất cánh | Của mình, PENDING/APPROVED | Không | Không |
| Duyệt/từ chối PENDING | Không | Có | Có |
| Chuyển APPROVED → ACTIVE → COMPLETED | Không | Có | Có |
| Khôi phục bản ghi kế hoạch | Không | Có | Có |
| Tra cứu người dùng | Hồ sơ bản thân | Có | Có |
| Tạo/sửa/xóa/khóa/mở khóa người dùng | Không | Không | Có |
| Tạo/sửa/xóa/khôi phục vai trò | Không | Không | Có |
| Xem nhật ký hệ thống | Không | Có | Có |
| Xóa mềm nhật ký | Không | Không | Có |

OPERATOR vào trang phương tiện của mình sau đăng nhập, thấy form khai báo
UAV và nộp kế hoạch. Không có nút duyệt/từ chối hoặc menu quản trị.

ADMIN/MANAGER vào hàng chờ duyệt, mặc định `status=PENDING`. Thấy người vận
hành, phương tiện, giờ bay và quỹ đạo, có nút Duyệt/Từ chối cùng xác nhận trước
khi thực hiện. Chọn trạng thái khác hoặc tất cả để xem và vận hành kế hoạch
đã duyệt. Không có form nộp kế hoạch, nút hủy thay client hoặc form khai báo
UAV mới. Trang UAV là danh sách quản lý; chọn Sửa mới mở form cập nhật hồ sơ.

API kiểm tra cùng quyền trên server. Sửa HTML hoặc gọi API trực tiếp không
cho phép client tự duyệt, quản lý nộp kế hoạch hay MANAGER quản trị tài khoản.
Quy tắc không xóa UAV còn kế hoạch mở, không tự khóa/xóa/hạ quyền ADMIN,
không xóa vai trò hệ thống và không vượt quyền sở hữu vẫn được giữ.

Các vai trò tùy chỉnh là danh mục; chưa có cơ chế quyền động để cấp nghiệp vụ
nộp kế hoạch cho vai trò khác OPERATOR.
