"""
detection_service.py
─────────────────────
Two providers:
  1. YOLODetectionProvider  — runs the real fine-tuned YOLOv8 model locally
  2. MockDetectionProvider  — random data fallback (no GPU / no model file)

Selector: get_detection_provider(provider_name)
  provider_name="yolo"  → YOLODetectionProvider
  provider_name="mock"  → MockDetectionProvider (default if model not found)
"""

import os
import random
import uuid
import math
from datetime import datetime
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent          # backend/services/
_BACKEND = _HERE.parent                          # backend/
_PROJECT = _BACKEND.parent                       # project root
MODEL_PATH = _PROJECT / "model" / "Yolov8-fintuned-on-potholes.pt"

# Severity conversion: YOLO confidence → 1.0-5.0 severity scale
def _conf_to_severity(conf: float) -> float:
    """Map detection confidence to a 1-5 severity score."""
    return round(1.0 + (conf ** 1.3) * 4.0, 2)

def _severity_label(sev: float) -> str:
    if sev <= 2.0:
        return "Low"
    if sev <= 3.5:
        return "Medium"
    return "High"

def _depth_estimate(sev: float) -> float:
    """Rough depth estimate from severity (for demo purposes)."""
    return round(1.5 + sev * 1.8 + random.uniform(-0.5, 0.5), 1)


# ── Abstract Base ──────────────────────────────────────────────────────────────

class DetectionProvider(ABC):
    @abstractmethod
    def detect(self, video_path: str, metadata: Optional[Dict[str, Any]] = None) -> List[dict]:
        raise NotImplementedError


# ── Real YOLOv8 Provider ───────────────────────────────────────────────────────

class YOLODetectionProvider(DetectionProvider):
    """
    Runs the fine-tuned YOLOv8 pothole model on a video file.
    Samples every Nth frame (configurable), runs inference, aggregates results.
    Uses your local GPU if CUDA is available, otherwise CPU.
    """

    def __init__(self, model_path: str = str(MODEL_PATH), frame_step: int = 30):
        """
        Args:
            model_path: Path to the .pt model file.
            frame_step: Process every Nth frame (30 = ~1 frame/second at 30fps).
        """
        from ultralytics import YOLO
        self.model = YOLO(model_path)
        self.frame_step = frame_step
        self.model_path = model_path
        print(f"[YOLO] Model loaded: {Path(model_path).name}")
        print(f"[YOLO] Task: {self.model.task}  |  Frame step: every {frame_step} frames")

    def detect(self, video_path: str, metadata: Optional[Dict[str, Any]] = None) -> List[dict]:
        """
        Run inference on video. Returns list of detection dicts.

        Each dict matches the ingest API DetectionItem schema:
          class_name, confidence, severity, depth_cm, bbox, frame_number
        """
        import cv2

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        print(f"[YOLO] Processing video: {video_path}")
        print(f"[YOLO] Total frames: {total_frames}  |  FPS: {fps:.1f}  |  Sampling every {self.frame_step} frames")

        detections = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % self.frame_step == 0:
                results = self.model(frame, verbose=False)
                for result in results:
                    for box in result.boxes:
                        conf = float(box.conf[0])
                        if conf < 0.35:          # ignore low-confidence detections
                            continue

                        xyxy = box.xyxy[0].tolist()
                        x1, y1, x2, y2 = xyxy
                        bbox_xywh = [
                            round(x1, 1), round(y1, 1),
                            round(x2 - x1, 1), round(y2 - y1, 1)
                        ]

                        # Get class name from model names dict
                        cls_id = int(box.cls[0])
                        class_name = self.model.names.get(cls_id, "pothole")

                        sev = _conf_to_severity(conf)

                        detections.append({
                            "detection_id": str(uuid.uuid4()),
                            "class_name": class_name,
                            "frame_number": frame_idx,
                            "confidence": round(conf, 3),
                            "severity": sev,
                            "severity_label": _severity_label(sev),
                            "depth_cm": _depth_estimate(sev),
                            "bbox": bbox_xywh,
                            "timestamp": datetime.utcnow(),
                        })

            frame_idx += 1

        cap.release()
        print(f"[YOLO] Done. Frames processed: {frame_idx // self.frame_step}  |  Detections: {len(detections)}")
        return detections


# ── Mock Provider (fallback) ───────────────────────────────────────────────────

class MockDetectionProvider(DetectionProvider):
    """
    Returns random detections. Used when:
      - ultralytics is not installed
      - model file doesn't exist
      - provider='mock' explicitly requested
    """
    def detect(self, video_path: str, metadata: Optional[Dict[str, Any]] = None) -> List[dict]:
        detections = []
        num_detections = random.randint(5, 15)
        now = datetime.utcnow()
        for i in range(num_detections):
            sev = round(random.uniform(1.5, 4.8), 2)
            conf = round(random.uniform(0.55, 0.97), 3)
            detections.append({
                "detection_id": str(uuid.uuid4()),
                "class_name": "pothole",
                "frame_number": random.randint(0, 1800),
                "timestamp": now,
                "confidence": conf,
                "severity": sev,
                "severity_label": _severity_label(sev),
                "depth_cm": _depth_estimate(sev),
                "bbox": [
                    round(random.uniform(10, 400), 1),
                    round(random.uniform(150, 350), 1),
                    round(random.uniform(40, 120), 1),
                    round(random.uniform(30, 90), 1),
                ],
            })
        return detections


# ── Factory ────────────────────────────────────────────────────────────────────

def get_detection_provider(provider_name: str = "auto") -> DetectionProvider:
    """
    provider_name:
      "yolo"  → Always use real YOLO model (raises if not available)
      "mock"  → Always use mock provider
      "auto"  → Use YOLO if model exists + ultralytics installed, else mock
    """
    if provider_name == "mock":
        return MockDetectionProvider()

    model_exists = MODEL_PATH.exists()

    try:
        import ultralytics  # noqa: F401
        yolo_available = True
    except ImportError:
        yolo_available = False

    if provider_name == "yolo":
        if not yolo_available:
            raise RuntimeError("ultralytics not installed. Run: pip install ultralytics")
        if not model_exists:
            raise RuntimeError(f"Model not found at: {MODEL_PATH}")
        return YOLODetectionProvider()

    # "auto" mode
    if yolo_available and model_exists:
        try:
            return YOLODetectionProvider()
        except Exception as e:
            print(f"[YOLO] WARNING: Failed to load model, falling back to mock: {e}")
            return MockDetectionProvider()

    if not yolo_available:
        print("[YOLO] ultralytics not installed → using MockDetectionProvider")
    elif not model_exists:
        print(f"[YOLO] Model not found at {MODEL_PATH} → using MockDetectionProvider")

    return MockDetectionProvider()
