import time
import urllib.request
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

LIVE_DATA_URL = "https://katchapp.in/kota_city_bus/live_gps/live_data"
CACHE_TTL_SECONDS = 5.0
_cache: Dict[str, Any] = {"timestamp": 0.0, "data": None}


def parse_float(val: Any, default: float = 0.0) -> float:
    try:
        if val is None or val == "" or val == "N":
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def determine_status(can: Dict[str, Any], gps: Dict[str, Any], bus_ts: Optional[str]) -> str:
    ch1 = parse_float(can.get("Charging_Current_1"), 0.0)
    ch2 = parse_float(can.get("Charging_Current_2"), 0.0)
    if ch1 > 0 or ch2 > 0:
        return "charging"
    
    speed = parse_float(can.get("Vehicle_Speed"), 0.0)
    if speed > 0:
        return "moving"
    
    return "idle"


def fetch_katchapp_live_data() -> Dict[str, Any]:
    global _cache
    now = time.time()
    if _cache["data"] is not None and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS:
        return _cache["data"]

    req = urllib.request.Request(
        LIVE_DATA_URL,
        headers={
            "User-Agent": "RoadPulseAI-Telemetry/1.0 (Mozilla/5.0)",
            "Accept": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            payload = json.loads(raw)
    except Exception as exc:
        if _cache["data"] is not None:
            return _cache["data"]
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch live transit GPS from KatchApp: {str(exc)}"
        )

    buses_raw = payload.get("data", {}).get("data", [])
    normalized_buses = []
    moving_count = 0
    idle_count = 0
    charging_count = 0

    for b in buses_raw:
        gps = b.get("gps_data") or {}
        can = b.get("can_data") or {}

        lat = parse_float(gps.get("latitude"))
        lon = parse_float(gps.get("longitude"))
        lat_dir = gps.get("latitude_dir", "N")
        lon_dir = gps.get("longitude_dir", "E")

        if lat_dir == "S":
            lat = -lat
        if lon_dir == "W":
            lon = -lon

        # Skip invalid or 0.0 coordinates
        if lat == 0.0 and lon == 0.0:
            continue

        status = determine_status(can, gps, b.get("timestamp"))
        if status == "moving":
            moving_count += 1
        elif status == "charging":
            charging_count += 1
        else:
            idle_count += 1

        speed = parse_float(can.get("Vehicle_Speed"), 0.0)
        heading = parse_float(gps.get("heading"), 0.0)
        soc = parse_float(can.get("A_SOC_Value"), 0.0)
        soh = parse_float(can.get("A_SOH_Value"), 100.0)
        power = parse_float(can.get("Instantaneous_Power"), 0.0)
        odometer = parse_float(can.get("ODOMETER"), 0.0)

        bus_label = b.get("bus_number") or b.get("vrn") or b.get("vin", "Unknown Bus")

        normalized_buses.append({
            "vehicle_id": bus_label,
            "vin": b.get("vin"),
            "imei": b.get("imei"),
            "latitude": lat,
            "longitude": lon,
            "speed": speed,
            "heading": heading,
            "status": status,
            "soc": soc,
            "soh": soh,
            "power": power,
            "odometer": odometer,
            "timestamp": b.get("timestamp") or time.strftime("%Y-%m-%d %H:%M:%S"),
            "road_name": "Kota Urban Corridor",
            "route_id": "PM E-Bus Sewa (KBSL)",
            "agency": "Kota Bus Sewa Limited (KBSL)"
        })

    result = {
        "source": "KatchApp Live GPS (Kota PM E-Bus Sewa)",
        "source_url": LIVE_DATA_URL,
        "count": len(normalized_buses),
        "moving": moving_count,
        "idle": idle_count,
        "charging": charging_count,
        "vehicles": normalized_buses,
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    _cache["timestamp"] = now
    _cache["data"] = result
    return result


@router.get("/live-fleet")
def get_live_fleet():
    """
    Returns real-time GPS locations and CAN bus telemetry for PM E-Bus Sewa
    (Kota Bus Sewa Limited) electric buses.
    """
    return fetch_katchapp_live_data()
