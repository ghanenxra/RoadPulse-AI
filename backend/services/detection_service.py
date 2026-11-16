"""
detection_service.py
─────────────────────
Two providers:
  1. YOLODetectionProvider  — runs the real fine-tuned YOLOv8 model locally
  2. MockDetectionProvider  — synthetic demo fallback (clearly flagged)

Selector: get_detection_provider(provider_name)
  provider_name="yolo"  → YOLODetectionProvider (strict: raises if model/libs missing)
  provider_name="mock"  → MockDetectionProvider (explicit synthetic data)
  provider_name="auto"  → Tries YOLO; if unavailable, uses Mock with clear provider flag
"""

import os
import random
import uuid
import math
from datetime import datetime, timezone
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent          # backend/services/
_BACKEND = _HERE.parent                          # backend/
_PROJECT = _BACKEND.parent                       # project root
MODEL_PATH = _PROJECT / "model" / "Yolov8-fintuned-on-potholes.pt"


def _severity_label(sev: float) -> str:
    """Standardized municipal severity classification tiers."""
    if sev <= 2.4:
        return "Low"
    if sev <= 3.7:
        return "Medium"
    return "High"


def estimate_visual_severity(
    bbox_xywh: Optional[List[float]],
    frame_width: float = 1920.0,
    frame_height: float = 1080.0
) -> Tuple[float, str]:
    """
    Derives an estimated physical severity proxy (1.0 - 5.0) from bounding box
    geometry relative to the camera frame dimensions.

    NOTE: YOLO confidence represents classification certainty, NOT physical severity.
    This function uses optical surface area ratio as a documented visual proxy:
      - Small (< 0.25% of frame): Severity 1.0 – 2.4 (Low)
      - Moderate (0.25% – 1.2% of frame): Severity 2.5 – 3.7 (Medium)
      - Severe / Large (>= 1.2% of frame): Severity 3.8 – 5.0 (High)
    """
    if not bbox_xywh or len(bbox_xywh) < 4:
        return 2.5, "Medium"

    w = max(0.0, float(bbox_xywh[2]))
    h = max(0.0, float(bbox_xywh[3]))
    frame_area = max(float(frame_width) * float(frame_height), 1.0)
    area_ratio = (w * h) / frame_area

    if area_ratio < 0.0025:
        # Normalized interpolation between 1.0 and 2.4
        t = min(area_ratio / 0.0025, 1.0)
        sev = 1.0 + t * 1.4
    elif area_ratio < 0.012:
        # Normalized interpolation between 2.5 and 3.7
        t = (area_ratio - 0.0025) / (0.012 - 0.0025)
        sev = 2.5 + t * 1.2
    else:
        # Normalized interpolation between 3.8 and 5.0
        t = min((area_ratio - 0.012) / 0.025, 1.0)
        sev = 3.8 + t * 1.2

    sev_clamped = round(min(max(sev, 1.0), 5.0), 2)
    return sev_clamped, _severity_label(sev_clamped)


def _depth_estimate(sev: float) -> float:
    """Simulated depth estimate from severity (used ONLY in synthetic demo workflows)."""
    return round(1.5 + sev * 1.8 + random.uniform(-0.5, 0.5), 1)


# ── Abstract Base ──────────────────────────────────────────────────────────────

class DetectionProvider(ABC):
    provider_name: str = "base"
    is_synthetic: bool = False

    @abstractmethod
    def detect(
        self,
        video_path: str,
        progress_callback: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[dict], dict]:
        raise NotImplementedError


# ── Real YOLOv8 Provider ───────────────────────────────────────────────────────

class YOLODetectionProvider(DetectionProvider):
    """
    Runs the fine-tuned YOLOv8 pothole model on a video file.
    Samples every Nth frame (configurable), runs inference, aggregates results.
    Uses local GPU if CUDA is available, otherwise CPU.
    """
    provider_name = "yolov8_local"
    is_synthetic = False

    def __init__(self, model_path: str = str(MODEL_PATH), frame_step: int = 30):
        try:
            import torch
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError(
                f"Cannot initialize YOLODetectionProvider: required packages missing ({exc}). "
                "Ensure torch and ultralytics are installed."
            ) from exc

        if not Path(model_path).exists():
            raise FileNotFoundError(f"YOLO model weights not found at: {model_path}")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = YOLO(model_path)
        self.frame_step = frame_step
        self.model_path = model_path
        print(f"[YOLO] Model loaded: {Path(model_path).name}")
        print(f"[YOLO] Task: {self.model.task}  |  Device: {self.device.upper()}  |  Frame step: every {frame_step} frames")

    def detect(
        self,
        video_path: str,
        progress_callback: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[dict], dict]:
        """
        Run inference on video. Returns (detections, video_info).
        """
        import cv2

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 1

        frame_width = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920.0
        frame_height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080.0
        duration_sec = round(total_frames / max(fps, 1.0), 2)

        print(f"[YOLO] Processing video: {video_path}")
        print(f"[YOLO] Total frames: {total_frames}  |  FPS: {fps:.1f}  |  Resolution: {int(frame_width)}x{int(frame_height)}  |  Duration: {duration_sec}s  |  Device: {self.device.upper()}")

        detections = []
        frame_idx = 0
        sampled_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % self.frame_step == 0:
                sampled_count += 1
                if progress_callback and total_frames > 0:
                    try:
                        progress_callback(min(frame_idx / total_frames, 1.0), frame_idx)
                    except Exception:
                        pass

                results = self.model(frame, device=self.device, verbose=False)
                for result in results:
                    for box in result.boxes:
                        conf = float(box.conf[0])
                        if conf < 0.25:          # standard YOLO detection confidence threshold
                            continue

                        xyxy = box.xyxy[0].tolist()
                        x1, y1, x2, y2 = xyxy
                        bbox_xywh = [
                            round(x1, 1), round(y1, 1),
                            round(x2 - x1, 1), round(y2 - y1, 1)
                        ]

                        cls_id = int(box.cls[0])
                        class_name = self.model.names.get(cls_id, "Potholes")

                        # Derive physical severity independently from visual proxy
                        sev, sev_label = estimate_visual_severity(bbox_xywh, frame_width, frame_height)

                        detections.append({
                            "detection_id": str(uuid.uuid4()),
                            "class_name": class_name,
                            "frame_number": frame_idx,
                            "confidence": round(conf, 3),          # Independent model certainty
                            "severity": sev,                       # Visual size proxy (1.0 - 5.0)
                            "severity_label": sev_label,
                            "severity_method": "visual_bbox_proxy",
                            "depth_cm": None,                      # Monocular 2D optical feed cannot measure physical depth
                            "depth_measured": False,
                            "bbox": bbox_xywh,
                            "is_synthetic": False,
                            "timestamp": datetime.now(timezone.utc).replace(tzinfo=None),
                        })

            frame_idx += 1

        cap.release()

        video_info = {
            "total_frames": total_frames,
            "fps": round(fps, 1),
            "duration_seconds": duration_sec,
            "frames_processed": sampled_count,
            "frame_width": int(frame_width),
            "frame_height": int(frame_height),
            "provider": self.provider_name,
            "is_synthetic": self.is_synthetic
        }

        print(f"[YOLO] Done. Frames sampled: {sampled_count}/{total_frames}  |  Detections: {len(detections)}")
        return detections, video_info


# ── Mock Provider (Synthetic Demo) ─────────────────────────────────────────────

class MockDetectionProvider(DetectionProvider):
    """
    Explicit synthetic demo provider.
    Used for local developer environments without GPU/model weights, or when explicitly requested.
    All detections generated by this provider are marked is_synthetic=True.
    """
    provider_name = "mock_yolo_v8"
    is_synthetic = True

    def detect(
        self,
        video_path: str,
        progress_callback: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[dict], dict]:
        detections = []
        num_detections = random.randint(5, 15)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for _ in range(num_detections):
            sev = round(random.uniform(1.5, 4.8), 2)
            conf = round(random.uniform(0.55, 0.97), 3)
            bbox_xywh = [
                round(random.uniform(10, 400), 1),
                round(random.uniform(150, 350), 1),
                round(random.uniform(40, 120), 1),
                round(random.uniform(30, 90), 1),
            ]
            detections.append({
                "detection_id": str(uuid.uuid4()),
                "class_name": "Potholes",
                "frame_number": random.randint(0, 1800),
                "timestamp": now,
                "confidence": conf,
                "severity": sev,
                "severity_label": _severity_label(sev),
                "severity_method": "synthetic_demo",
                "depth_cm": _depth_estimate(sev),  # Simulated measurement for demo
                "depth_measured": False,
                "bbox": bbox_xywh,
                "is_synthetic": True,
            })
        video_info = {
            "total_frames": 1800,
            "fps": 30.0,
            "duration_seconds": 60.0,
            "frames_processed": 60,
            "provider": self.provider_name,
            "is_synthetic": True
        }
        return detections, video_info


# ── Factory ────────────────────────────────────────────────────────────────────

def get_detection_provider(provider_name: str = "auto") -> DetectionProvider:
    """
    Provider factory supporting explicit and auto modes:
      "yolo"  → Strict YOLOv8 provider. Raises RuntimeError if model or dependencies missing.
      "mock"  → Explicit synthetic demo provider.
      "auto"  → Prefers YOLOv8 if model and packages available; otherwise falls back to Mock with explicit flag.
    """
    mode = provider_name.lower().strip()

    if mode == "mock":
        return MockDetectionProvider()

    model_exists = MODEL_PATH.exists()

    try:
        import torch        # noqa: F401
        import ultralytics  # noqa: F401
        yolo_available = True
    except ImportError:
        yolo_available = False

    if mode == "yolo":
        if not yolo_available:
            raise RuntimeError("YOLO mode requested but 'ultralytics' or 'torch' is not installed.")
        if not model_exists:
            raise RuntimeError(f"YOLO mode requested but model file is missing at: {MODEL_PATH}")
        return YOLODetectionProvider()

    # "auto" mode: attempt real YOLO, fallback to mock with warning
    if yolo_available and model_exists:
        try:
            return YOLODetectionProvider()
        except Exception as e:
            print(f"[YOLO] WARNING: Failed to load YOLO model, using Mock fallback: {e}")
            return MockDetectionProvider()

    if not yolo_available:
        print("[YOLO] Notice: 'ultralytics' not installed → using MockDetectionProvider")
    elif not model_exists:
        print(f"[YOLO] Notice: Model not found at {MODEL_PATH} → using MockDetectionProvider")

    return MockDetectionProvider()
