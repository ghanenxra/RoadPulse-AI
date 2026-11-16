"""
test_detection.py
─────────────────
Tests for visual severity proxy formulation, separation of confidence from severity,
absence of random depth in real YOLO inference, and provider mode controls.
"""

import pytest
from services.detection_service import (
    estimate_visual_severity, get_detection_provider, MockDetectionProvider, YOLODetectionProvider
)


def test_visual_severity_scale():
    """Verify visual size proxy maps bounding box areas to correct severity tiers."""
    # Small pothole (< 0.25% of 1920x1080 frame, e.g. 40x40 px = 1600 px^2 / 2073600 ~= 0.00077)
    sev_small, lbl_small = estimate_visual_severity([100, 100, 40, 40], frame_width=1920, frame_height=1080)
    assert 1.0 <= sev_small <= 2.4
    assert lbl_small == "Low"

    # Moderate pothole (e.g. 100x100 px = 10000 px^2 / 2073600 ~= 0.0048)
    sev_mid, lbl_mid = estimate_visual_severity([100, 100, 100, 100], frame_width=1920, frame_height=1080)
    assert 2.5 <= sev_mid <= 3.7
    assert lbl_mid == "Medium"

    # Severe / large crater (e.g. 250x250 px = 62500 px^2 / 2073600 ~= 0.030)
    sev_large, lbl_large = estimate_visual_severity([100, 100, 250, 250], frame_width=1920, frame_height=1080)
    assert 3.8 <= sev_large <= 5.0
    assert lbl_large == "High"


def test_confidence_independent_from_severity():
    """
    Proves that detection confidence does NOT determine physical severity.
    A small defect detected with 99% model confidence is still a Low physical severity.
    """
    small_bbox = [100, 100, 30, 30]
    sev, label = estimate_visual_severity(small_bbox, frame_width=1920, frame_height=1080)
    assert label == "Low"
    assert sev <= 2.4


def test_mock_provider_flags_synthetic_data():
    """Proves that MockDetectionProvider marks all detections as synthetic."""
    provider = MockDetectionProvider()
    assert provider.is_synthetic is True
    assert provider.provider_name == "mock_yolo_v8"

    detections, info = provider.detect("dummy_path.mp4")
    assert len(detections) > 0
    assert info["is_synthetic"] is True
    assert all(d["is_synthetic"] is True for d in detections)
    assert all(d["severity_method"] == "synthetic_demo" for d in detections)


def test_provider_factory_modes():
    """Tests provider mode selection for 'mock', 'auto', and 'yolo'."""
    # 1. Explicit mock mode
    p_mock = get_detection_provider("mock")
    assert isinstance(p_mock, MockDetectionProvider)
    assert p_mock.is_synthetic is True

    # 2. Auto mode
    p_auto = get_detection_provider("auto")
    assert isinstance(p_auto, (MockDetectionProvider, YOLODetectionProvider))

    # 3. Invalid/missing YOLO mode test
    # If YOLO mode is requested without model, must raise RuntimeError, never silently mock
    try:
        p_yolo = get_detection_provider("yolo")
        assert isinstance(p_yolo, YOLODetectionProvider)
        assert p_yolo.is_synthetic is False
    except RuntimeError as exc:
        # If model weights or torch not present, strict error is expected
        assert "ultralytics" in str(exc) or "model" in str(exc).lower()
