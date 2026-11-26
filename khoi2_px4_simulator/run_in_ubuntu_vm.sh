#!/usr/bin/env bash
# ==============================================================================
# KHỐI 2 — SCRIPT KHỞI CHẠY TRONG MÁY ẢO UBUNTU LINUX (WSL2 / VIRTUALBOX / DOCKER)
# Chạy hoàn toàn bên trong môi trường Ubuntu Linux và phát WebSocket 10Hz (:8001)
# ra cho Web 3D Khối 4 (:3000) và nhận đơn bay từ Khối 1 của Vương (:8080).
# ==============================================================================
set -e

echo "================================================================"
echo " [KHỐI 2 - UBUNTU LINUX VM] Khởi động PX4 SITL & Backend :8001"
echo "================================================================"

if ! command -v python3 >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y python3 python3-pip sqlite3
fi

python3 -m pip install --quiet fastapi "uvicorn[standard]" pydantic

echo "[OK] Đang chạy Khối 2 PX4 SITL Simulator tại http://0.0.0.0:8001 ..."
python3 -m uvicorn khoi2_px4_simulator.main:app --host 0.0.0.0 --port 8001
