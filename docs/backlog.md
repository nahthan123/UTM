# Việc xem xét sau bản nền

Các thay đổi mô hình sau đã được chấp thuận giữ nguyên trước khi tích hợp bên ngoài;
không khôi phục trong đợt tích hợp này:

- Quy trình duyệt doanh nghiệp VERIFIED/PENDING (`CompanyStatus`) chưa có trong mô hình mới.
- Phân loại UAV MULTIROTOR/FIXED_WING/HYBRID đã được bổ sung lại theo yêu cầu
  chỉnh form khai báo phương tiện sau bước 1. `Drone.model` vẫn là tên mẫu UAV;
  dữ liệu cũ chưa biết loại giữ null, người vận hành cập nhật đúng thông số.
- Các trường yêu cầu bay cũ `missionName`, `departureLocation`, `destinationLocation`,
  `sentAt` chưa có trường tương đương trong `FlightPlan`.

Hồ sơ doanh nghiệp hiện nằm trong `UserAccount` với `AccountType.BUSINESS`;
đăng ký qua `RegisterRequest` và `AuthService`. Kế hoạch bay 4D dùng `FlightPlan`
và `FlightPlanRepository`. Chưa có migration từ các bảng mô hình cũ sang mô hình này.
