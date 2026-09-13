import random
import uuid
from datetime import datetime
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

class DetectionProvider(ABC):
    @abstractmethod
    def detect(self, video_path: str, metadata: Optional[Dict[str, Any]] = None) -> List[dict]:
        raise NotImplementedError

class MockDetectionProvider(DetectionProvider):
    def detect(self, video_path: str, metadata: Optional[Dict[str, Any]] = None) -> List[dict]:
        detections = []
        num_detections = random.randint(5, 15)
        now = datetime.utcnow()
        for i in range(num_detections):
            detections.append({
                "detection_id": str(uuid.uuid4()),
                "timestamp": now,
                "latitude": 26.9 + random.uniform(-0.05, 0.05),
                "longitude": 75.8 + random.uniform(-0.05, 0.05),
                "confidence": random.uniform(0.7, 0.99),
                "severity": random.uniform(1.0, 5.0),
                "severity_label": random.choice(["Low", "Medium", "High"]),
                "depth_cm": random.uniform(2.0, 10.0),
                "bbox": "[10, 20, 30, 40]"
            })
        return detections

def get_detection_provider(provider_name: str = 'mock') -> DetectionProvider:
    if provider_name == 'mock':
        return MockDetectionProvider()
    raise ValueError(f'Unknown provider: {provider_name}')
