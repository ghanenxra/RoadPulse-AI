from fastapi import APIRouter

router = APIRouter()

@router.get('/api/health')
def health_check():
    return {'status': 'healthy', 'service': 'RoadPulse AI', 'version': '1.0.0-prototype'}
