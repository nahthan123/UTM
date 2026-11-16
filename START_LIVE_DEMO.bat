@echo off
chcp 65001 > nul
title HỆ THỐNG UTM ĐÀ NẴNG - LIVE DEMO TÍCH HỢP KHỐI 2 & KHỐI 4
color 0A

echo =========================================================================
echo   TRƯỜNG ĐẠI HỌC ĐÔNG Á - LỚP ST23B
echo   ĐỀ TÀI: HỆ THỐNG UTM TÍCH HỢP AI PHÂN TÁCH XUNG ĐỘT CHIẾN LƯỢC/CHIẾN THUẬT
echo   GVHD: ThS./TS. ĐINH QUỐC TOÀN
echo =========================================================================
echo.
echo [1/4] Đang khởi động Cầu nối Telemetry Relay Bridge (Port 8080)...
start "1. TELEMETRY RELAY BRIDGE (PORT 8080)" cmd /k "cd /d D:\Nghien cuu khoa hoc && python telemetry_relay.py"
timeout /t 2 /nobreak > nul

echo [2/4] Đang khởi động Backend AI Chiến thuật Khối 5 (FastAPI Port 8000)...
start "2. BACKEND AI CHIẾN THUẬT KHỐI 5 (PORT 8000)" cmd /k "cd /d D:\Nghien cuu khoa hoc && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak > nul

echo [3/4] Đang khởi động Trạm Giám sát Không lưu 3D Khối 4 (React Cesium Port 3000)...
start "3. TRẠM GIÁM SÁT 3D KHỐI 4 (PORT 3000)" cmd /k "cd /d D:\Nghien cuu khoa hoc && npm run dev -- --host 127.0.0.1 --port 3000"
timeout /t 2 /nobreak > nul

echo [4/4] Đang khởi động Bộ Mô phỏng Khối 2 của Phước (Port 5173)...
start "4. BỘ MÔ PHỎNG KHỐI 2 PHƯỚC (PORT 5173)" cmd /k "cd /d D:\UTM_Phuoc && npm run dev"

echo.
echo =========================================================================
echo   KHỞI ĐỘNG HOÀN TẤT CẢ 4 THÀNH PHẦN!
echo.
echo   • Tab 1: Mô phỏng Khối 2 (Phước)       -> http://localhost:5173
echo   • Tab 2: Trạm Giám sát Khối 4 (Nhật Anh) -> http://localhost:3000
echo   • Tab 3: API AI Khối 5 (FastAPI)        -> http://127.0.0.1:8000/docs
echo   • Tab 4: Cầu nối WebSocket Relay        -> ws://localhost:8080/utm/telemetry
echo.
echo   HƯỚNG DẪN DEMO:
echo   1. Mở http://localhost:5173 (Phước): Thấy nút "LIVE KHỐI 4: ĐANG PHÁT" màu xanh.
echo   2. Mở http://localhost:3000 (Nhật Anh): Bấm nút "Chế độ LIVE (WS)" trên thanh TopBar.
echo   3. Máy bay của Phước sẽ tự động bay và vẽ vệt 3D trên màn hình của Nhật Anh!
echo =========================================================================
pause
