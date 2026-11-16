import asyncio
import json
import websockets

async def test_relay():
    uri = "ws://localhost:8080/utm/telemetry"
    try:
        async with websockets.connect(uri) as ws:
            packet = {
                "messageType": "UAV_TELEMETRY",
                "timestamp": "2026-11-05T08:37:00.000Z",
                "simulationTimeSec": 10.5,
                "uav": {
                    "id": "UAV-TEST",
                    "callsign": "TEST-FLIGHT-01",
                    "type": "Multirotor",
                    "position": {
                        "longitude": 108.2000,
                        "latitude": 16.0500,
                        "altitudeAGL_m": 80
                    },
                    "movement": {
                        "airSpeed_mps": 15,
                        "groundSpeed_mps": 15,
                        "headingDeg": 90,
                        "driftAngleDeg": 0
                    },
                    "system": {
                        "batteryPercent": 95,
                        "flightMode": "AUTONOMOUS_UTM_CONTROL"
                    }
                }
            }
            await ws.send(json.dumps([packet]))
            print("Successfully sent test packet to relay!")
    except Exception as e:
        print(f"Could not connect to relay: {e}")

if __name__ == "__main__":
    asyncio.run(test_relay())
