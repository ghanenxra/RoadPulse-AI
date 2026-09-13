import json
import math
import os

# Haversine distance in meters
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000 # meters
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dLon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
def bearing(lat1, lon1, lat2, lon2):
    dLon = math.radians(lon2 - lon1)
    y = math.sin(dLon) * math.cos(math.radians(lat2))
    x = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - 
         math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dLon))
    b = math.degrees(math.atan2(y, x))
    return (b + 360) % 360

# Smooth Great-Circle / Geodesic Interpolation between two lat/lon points
def interpolate_points(p1, p2, step_meters=38.0):
    dist = haversine(p1[0], p1[1], p2[0], p2[1])
    num_steps = max(1, int(round(dist / step_meters)))
    pts = []
    for i in range(num_steps):
        f = i / float(num_steps)
        lat = p1[0] + (p2[0] - p1[0]) * f
        lon = p1[1] + (p2[1] - p1[1]) * f
        pts.append([round(lat, 6), round(lon, 6)])
    return pts

# Build full corridor from list of key road centerline anchors
def build_corridor(anchors, step_meters=38.0):
    full_path = []
    for i in range(len(anchors) - 1):
        segment_pts = interpolate_points(anchors[i], anchors[i+1], step_meters)
        full_path.extend(segment_pts)
    full_path.append([round(anchors[-1][0], 6), round(anchors[-1][1], 6)])
    return full_path

# True wide-arterial centerline anchors for all 20 transit corridors in Jaipur
CORRIDORS = {
    "TR-01": {
        "road": "Tonk Road",
        "sub": "Gopalpura Flyover to Durgapura Flyover (NH-52)",
        "anchors": [
            [26.8665, 75.7972],  # North approach near Gopalpura
            [26.8638, 75.7963],  # Gopalpura Flyover
            [26.8550, 75.7947],  # Mahavir Nagar
            [26.8465, 75.7935],  # Durgapura elevated approach
            [26.8390, 75.7925],  # Durgapura Flyover
            [26.8335, 75.7930],  # B2 Bypass / Tonk Road junction
        ]
    },
    "JLN-01": {
        "road": "JLN Marg",
        "sub": "MNIT / WTP to Jawahar Circle Boulevard",
        "anchors": [
            [26.8640, 75.8115],  # MNIT Campus gate
            [26.8575, 75.8080],  # Malviya Nagar entrance
            [26.8530, 75.8055],  # World Trade Park (WTP)
            [26.8460, 75.8065],  # Fortis Hospital
            [26.8385, 75.8080],  # Jawahar Circle Roundabout
        ]
    },
    "JG-01": {
        "road": "Jawahar Circle - Gopalpura Bypass",
        "sub": "Jawahar Circle to Tonk Road (B2 Bypass)",
        "anchors": [
            [26.8385, 75.8080],  # Jawahar Circle West Gate
            [26.8388, 75.8020],  # B2 Bypass central corridor
            [26.8387, 75.7970],  # B2 Bypass west
            [26.8385, 75.7925],  # Tonk Road Durgapura junction
        ]
    },
    "AJ-01": {
        "road": "Ajmer Road",
        "sub": "Sodala Elevated to Vaishali Nagar (NH-48)",
        "anchors": [
            [26.9030, 75.7760],  # Sodala Elevated Expressway
            [26.9015, 75.7680],  # Ram Nagar Metro Station
            [26.8995, 75.7580],  # Shyam Nagar / Purani Chungi
            [26.8975, 75.7470],  # DCM / Queens Road junction
            [26.8955, 75.7360],  # Vaishali Nagar / Chitrakoot junction
        ]
    },
    "SR-01": {
        "road": "Sikar Road",
        "sub": "Ambabari Crossing to VKIA Road No. 1 (NH-52)",
        "anchors": [
            [26.9510, 75.7770],  # Ambabari junction
            [26.9620, 75.7750],  # Alka Cinema stretch
            [26.9730, 75.7735],  # Dadi Ka Phatak flyover
            [26.9840, 75.7720],  # VKI Road No. 1 junction
        ]
    },
    "MI-01": {
        "road": "MI Road",
        "sub": "Government Hostel to Ajmeri Gate Boulevard",
        "anchors": [
            [26.9205, 75.7975],  # Govt Hostel Crossing
            [26.9195, 75.8040],  # Ganpati Plaza
            [26.9180, 75.8115],  # Panch Batti
            [26.9168, 75.8165],  # Jayanti Market
            [26.9155, 75.8205],  # Ajmeri Gate
        ]
    },
    "CL-01": {
        "road": "Civil Lines Road",
        "sub": "Civil Lines Metro to Raj Bhavan VIP Avenue",
        "anchors": [
            [26.9030, 75.7860],  # Civil Lines Metro
            [26.9080, 75.7875],  # Jacob Road
            [26.9135, 75.7885],  # Raj Bhavan / CM Residence
            [26.9190, 75.7890],  # Railway Road junction
        ]
    },
    "VN-01": {
        "road": "Vidhyadhar Nagar Road",
        "sub": "Central Spine Sector 2 to Sector 9 Avenue",
        "anchors": [
            [26.9530, 75.7880],  # Sector 2 Circle
            [26.9600, 75.7885],  # National Handloom
            [26.9670, 75.7890],  # Sector 5 Commercial
            [26.9740, 75.7895],  # Sector 9 Bypass
        ]
    },
    "CD-01": {
        "road": "Chandpole Bazar Road",
        "sub": "Chandpole Gate to Chhoti Chaupar (Heritage Arterial)",
        "anchors": [
            [26.9242, 75.8075],  # Chandpole Gate
            [26.9245, 75.8140],  # Chandpole Bazar mid
            [26.9248, 75.8205],  # Chhoti Chaupar
        ]
    },
    "TG-01": {
        "road": "Tripolia Bazar",
        "sub": "Chhoti Chaupar to Badi Chaupar (City Center)",
        "anchors": [
            [26.9248, 75.8205],  # Chhoti Chaupar
            [26.9251, 75.8250],  # Tripolia Gate
            [26.9255, 75.8295],  # Badi Chaupar
        ]
    },
    "HA-01": {
        "road": "Hawa Mahal Road",
        "sub": "Badi Chaupar past Hawa Mahal to Subhash Chowk",
        "anchors": [
            [26.9255, 75.8295],  # Badi Chaupar
            [26.9275, 75.8300],  # Hawa Mahal Front
            [26.9310, 75.8308],  # Sireh Deori Bazar
            [26.9360, 75.8315],  # Subhash Chowk
        ]
    },
    "AG-01": {
        "road": "Agra Road",
        "sub": "Transport Nagar to Ghat Ki Guni Valley (NH-21)",
        "anchors": [
            [26.9060, 75.8450],  # Transport Nagar
            [26.9010, 75.8520],  # Agra Road entry
            [26.8960, 75.8590],  # Ghat Ki Guni
            [26.8920, 75.8660],  # Sisodia Rani Garden
        ]
    },
    "SN-01": {
        "road": "Sahakar Marg",
        "sub": "22 Godam Circle to Rajasthan Vidhan Sabha",
        "anchors": [
            [26.9000, 75.7940],  # 22 Godam Circle
            [26.8920, 75.7960],  # Lal Kothi
            [26.8870, 75.7975],  # Vidhan Sabha
            [26.8830, 75.7985],  # Jyoti Nagar Crossing
        ]
    },
    "MD-01": {
        "road": "Mansarovar Madhyam Marg",
        "sub": "Shipra Path to VT Road Junction Boulevard",
        "anchors": [
            [26.8580, 75.7680],  # Shipra Path
            [26.8510, 75.7650],  # Varun Path
            [26.8450, 75.7630],  # Kiran Path
            [26.8390, 75.7610],  # VT Road Junction
        ]
    },
    "GL-01": {
        "road": "Gokhale Marg",
        "sub": "Ahinsa Circle to Statue Circle / Raj Bhavan",
        "anchors": [
            [26.9130, 75.8035],  # Ahinsa Circle
            [26.9080, 75.8000],  # Panch Batti branch
            [26.9045, 75.7965],  # Statue Circle
            [26.9015, 75.7935],  # Raj Bhavan / 22 Godam
        ]
    },
    "KP-01": {
        "road": "Khatipura Road",
        "sub": "Hasanpura Crossing to Khatipura Tiraha Arterial",
        "anchors": [
            [26.9220, 75.7760],  # Hasanpura
            [26.9225, 75.7640],  # Jhotwara Road branch
            [26.9228, 75.7530],  # Officers Campus
            [26.9230, 75.7420],  # Khatipura Tiraha
        ]
    },
    "MN-01": {
        "road": "Calgiri Marg",
        "sub": "Apex Circle to Calgiri Hospital Dual Carriageway",
        "anchors": [
            [26.8580, 75.8135],  # Apex Circle
            [26.8530, 75.8180],  # Sector 3 Market
            [26.8480, 75.8210],  # Calgiri Hospital
            [26.8440, 75.8235],  # Haldi Ghati Marg
        ]
    },
    "BR-01": {
        "road": "Bais Godam Industrial Road",
        "sub": "22 Godam Circle to Sudarshanpura / Hawa Sadak",
        "anchors": [
            [26.9000, 75.7920],  # 22 Godam Circle
            [26.8940, 75.7890],  # Hawa Sadak
            [26.8880, 75.7865],  # Sudarshanpura Crossing
            [26.8830, 75.7840],  # Civil Lines South
        ]
    },
    "JP-01": {
        "road": "Jagatpura Central Spine",
        "sub": "7 Number Bus Stand to Akshay Patra / CBI Colony",
        "anchors": [
            [26.8330, 75.8340],  # 7 Number Bus Stand
            [26.8260, 75.8390],  # Mahal Road
            [26.8190, 75.8440],  # Akshay Patra Temple
            [26.8120, 75.8490],  # CBI Colony
        ]
    },
    "VK-01": {
        "road": "Vishwakarma (VKI) Road No. 1",
        "sub": "Sikar Road Junction to Road No. 5 Crossing",
        "anchors": [
            [26.9840, 75.7720],  # Sikar Road Junction
            [26.9890, 75.7690],  # Road No. 1 mid
            [26.9940, 75.7660],  # Road No. 3 Crossing
            [26.9990, 75.7630],  # Road No. 5 Crossing
        ]
    },
}

def main():
    json_path = "backend/data/demo-data.json"
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded demo-data with {len(data['segments'])} segments")

    for seg in data["segments"]:
        seg_id = seg["id"]
        if seg_id in CORRIDORS:
            cinfo = CORRIDORS[seg_id]
            seg["road"] = cinfo["road"]
            seg["sub"] = cinfo["sub"]
            clean_pts = build_corridor(cinfo["anchors"], step_meters=38.0)
            seg["coords"] = clean_pts

            total_dist = 0.0
            for i in range(len(clean_pts) - 1):
                total_dist += haversine(clean_pts[i][0], clean_pts[i][1], clean_pts[i+1][0], clean_pts[i+1][1])

            print(f"Segment {seg_id:<6} ({cinfo['road']:<30}): {len(clean_pts)} waypoints, {total_dist/1000.0:.2f} km")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("Successfully updated demo-data.json with clean arterial geometries!")

if __name__ == "__main__":
    main()

