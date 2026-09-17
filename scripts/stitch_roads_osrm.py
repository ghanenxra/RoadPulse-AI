import urllib.request
import json
import time
import sys
import os

sys.path.insert(0, "scripts")
from generate_clean_corridors import CORRIDORS

def haversine(lat1, lon1, lat2, lon2):
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_stitched_route(cid, cinfo):
    anchors = cinfo["anchors"]
    p_start = anchors[0]
    p_end = anchors[-1]
    
    # Query OSRM with continue_straight=true
    url = (f"http://router.project-osrm.org/route/v1/driving/"
           f"{p_start[1]:.6f},{p_start[0]:.6f};{p_end[1]:.6f},{p_end[0]:.6f}"
           f"?overview=full&geometries=geojson&continue_straight=true")
    
    req = urllib.request.Request(url, headers={"User-Agent": "RoadPulse-AI-Stitcher/2.0 (contact@roadpulse.ai)"})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
            if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                route = data["routes"][0]
                geometry = route["geometry"]["coordinates"] # list of [lon, lat]
                # Invert to [lat, lon] for Leaflet and demo-data.json
                lat_lon_pts = [[round(pt[1], 6), round(pt[0], 6)] for pt in geometry]
                return lat_lon_pts, route["distance"] / 1000.0
    except Exception as e:
        print(f"Error fetching OSRM for {cid}: {e}")
    return None, 0

def main():
    json_path = "backend/data/demo-data.json"
    with open(json_path, "r", encoding="utf-8") as f:
        demo_data = json.load(f)

    print(f"Loaded demo-data with {len(demo_data['segments'])} segments")
    print("=" * 80)
    print(f"{'ID':<7} {'Road Name':<32} {'Old Pts':<9} {'New Pts':<9} {'Road Km':<8} Status")
    print("-" * 80)

    updated_count = 0
    for seg in demo_data["segments"]:
        cid = seg["id"]
        if cid in CORRIDORS:
            cinfo = CORRIDORS[cid]
            old_pts = len(seg.get("coords", []))
            
            # Fetch real road-stitched coordinates from OSRM
            new_coords, road_km = get_stitched_route(cid, cinfo)
            if new_coords and len(new_coords) > 10:
                seg["coords"] = new_coords
                seg["road"] = cinfo["road"]
                seg["sub"] = cinfo["sub"]
                updated_count += 1
                print(f"{cid:<7} {cinfo['road'][:30]:<32} {old_pts:<9} {len(new_coords):<9} {road_km:<8.2f} STITCHED")
            else:
                print(f"{cid:<7} {cinfo['road'][:30]:<32} {old_pts:<9} {'FAILED':<9} {'-':<8} UNCHANGED")
            time.sleep(0.3)

    print("=" * 80)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(demo_data, f, indent=2)

    print(f"Successfully stitched {updated_count}/{len(demo_data['segments'])} road corridors to real OpenStreetMap geometry!")

if __name__ == "__main__":
    main()

