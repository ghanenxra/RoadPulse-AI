import os
import uuid
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from backend.models.database import get_db, ProcessingJob, VideoAsset
from backend.schemas.api_schemas import ProcessingJobResponse
from backend.services.detection_service import get_detection_provider

router = APIRouter()

@router.post('/api/upload')
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    os.makedirs("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/uploads", exist_ok=True)
    file_location = f"C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
        
    vid = f"VID-{uuid.uuid4().hex[:8]}"
    db.add(VideoAsset(
        video_id=vid, upload_time=datetime.utcnow(), 
        duration_seconds=60.0, metadata_source="upload", 
        status="uploaded", file_path=file_location
    ))
    
    job_id = f"JOB-{uuid.uuid4().hex[:8]}"
    job = ProcessingJob(
        job_id=job_id, video_id=vid, source="upload",
        status="queued", progress=0.0, created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    return {"job_id": job_id, "video_id": vid, "message": "Video uploaded successfully."}

@router.get('/api/jobs')
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(ProcessingJob).order_by(ProcessingJob.created_at.desc()).all()
    return jobs

@router.get('/api/jobs/{job_id}')
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job

async def simulate_processing(job_id: str, db: Session):
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job: return
    
    job.status = "processing"
    db.commit()
    
    # Simulate processing delay
    await asyncio.sleep(2)
    job.progress = 50.0
    db.commit()
    
    await asyncio.sleep(2)
    provider = get_detection_provider('mock')
    detections = provider.detect(job.video_id)
    
    job.status = "completed"
    job.progress = 100.0
    job.detections_count = len(detections)
    job.completed_at = datetime.utcnow()
    db.commit()

@router.post('/api/jobs/{job_id}/process')
async def process_job(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
        
    background_tasks.add_task(simulate_processing, job_id, db)
    return {"message": "Processing started", "job_id": job_id}
