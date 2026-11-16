"""
UTM TELEMETRY RELAY BRIDGE (PORT 8080)
Transfers live ASTM F3411 Telemetry from Part 2 Simulator (Phuoc - Port 5173)
to Part 4 UTM 3D Monitoring Station (Nhat Anh - Port 3000) and Part 5 AI Engine.

Strictly preserves architecture boundaries:
- Zero memory leakage between Part 2 and Part 4.
- Broadcasts raw packets over WebSocket ws://localhost:8080/utm/telemetry.
- Logs all packets to live session file for replay and validation.
"""

import asyncio
import json
import os
import sys
from datetime import datetime

# Configure UTF-8 output to prevent Windows cp1258 encoding crashes
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    import websockets
except ImportError:
    print("Error: 'websockets' package is required. Install via: pip install websockets")
    sys.exit(1)

HOST = "0.0.0.0"
PORT = 8080
PATH = "/utm/telemetry"

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, f"live_telemetry_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl")

connected_clients = set()
packet_counter = 0

async def handler(websocket):
    global packet_counter
    # Accept any path or require /utm/telemetry
    client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
    connected_clients.add(websocket)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [+] Client connected: {client_ip} (Total active: {len(connected_clients)})")

    try:
        async for message in websocket:
            packet_counter += 1
            # Parse message to validate JSON
            try:
                data = json.loads(message)
                now_str = datetime.now().strftime('%H:%M:%S')

                # Log packet to file for reproducible evaluation
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(json.dumps(data) + "\n")

                if isinstance(data, list):
                    summary = f"{len(data)} packets (batch)"
                elif isinstance(data, dict):
                    msg_type = data.get("messageType", "UNKNOWN")
                    uav_id = data.get("uav", {}).get("id", "N/A")
                    summary = f"{msg_type} for {uav_id}"
                else:
                    summary = "raw data"

                if packet_counter % 10 == 1 or packet_counter <= 5:
                    print(f"[{now_str}] [Packet #{packet_counter}] Relayed: {summary} -> {len(connected_clients) - 1} receivers")

                # Broadcast to all other connected clients
                recipients = [ws for ws in connected_clients if ws != websocket]
                if recipients:
                    await asyncio.gather(*[ws.send(message) for ws in recipients], return_exceptions=True)

            except json.JSONDecodeError:
                print(f"[-] Ignored non-JSON message from {client_ip}")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [-] Client disconnected: {client_ip} (Remaining: {len(connected_clients)})")

async def main():
    print("=" * 65)
    print(f"  UTM TELEMETRY RELAY BRIDGE - GVHD: ThS./TS. Đinh Quốc Toàn")
    print(f"  Listening on: ws://localhost:{PORT}{PATH}")
    print(f"  Live log destination: {LOG_FILE}")
    print("=" * 65)
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[!] Telemetry Relay stopped by user.")
