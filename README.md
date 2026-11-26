# Khối 2 — Mô phỏng PX4 SITL / Gazebo & Sinh dữ liệu Telemetry (Port 8001)

Module mô phỏng chuyến bay UAV khu vực Đà Nẵng (6-DOF PX4 SITL + MAVLink + SQLite + Dashboard 3D), kết nối vòng kín trực tiếp với:
- **Khối 1 — Vương (`:8080`)**: Nhận kế hoạch bay đã duyệt (`POST /api/integration/flight-plans`) & tự đồng bộ danh sách UAV đã đăng ký (`GET /api/integration/registered-uavs`).
- **Khối 4 — Nhật Anh (`:3000` / `:8000`)**: Phát luồng telemetry 10Hz qua WebSocket (`ws://localhost:8001/ws/telemetry`) và nhận lệnh điều khiển trực tiếp (`POST /api/commands`).

## 1. Chạy nhanh trên Python

```bash
pip install -r requirements.txt
python -m uvicorn khoi2_px4_simulator.main:app --host 0.0.0.0 --port 8001
```

Mở giao diện 3D & kiểm chứng 8 tiêu chí tại: http://localhost:8001

## 2. Chạy bằng Docker / Ubuntu VM

```bash
docker build -f khoi2_px4_simulator/Dockerfile.khoi2 -t utm-khoi2-ubuntu .
docker run -d --name utm-khoi2-vm -p 8001:8001 utm-khoi2-ubuntu
```

Hoặc trong máy ảo Ubuntu: `bash khoi2_px4_simulator/run_in_ubuntu_vm.sh`

## 3. Chạy kiểm thử tự động

```bash
python -m pytest backend/tests/test_khoi2_px4_simulator.py -v
```
