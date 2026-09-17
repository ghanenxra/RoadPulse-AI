import urllib.request
from pathlib import Path

video_file = Path("sample_data/sample_dashcam_pothole_clip.mp4")
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="{video_file.name}"\r\n'
    f"Content-Type: video/mp4\r\n\r\n"
).encode("utf-8") + video_file.read_bytes() + (
    f"\r\n--{boundary}\r\n"
    f'Content-Disposition: form-data; name="bus_id"\r\n\r\nBUS-1\r\n'
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="station_id"\r\n\r\nCS-1\r\n'
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="road_segment_id"\r\n\r\nTR-01\r\n'
    f"--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(
    "https://roadpulse-ai-wjsk.onrender.com/api/upload",
    data=body,
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "Mozilla/5.0"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=30) as res:
        print("Upload status on Render:", res.status)
        print("Response:", res.read().decode())
except Exception as e:
    print("Render upload result:", e)

