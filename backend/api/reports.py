import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from models.database import get_db
from services.report_service import (
    generate_weekly_pdf, export_detections_csv, export_road_segments_csv,
    export_weekly_history_csv, export_authority_actions_csv, export_processing_jobs_csv
)

router = APIRouter()

@router.get('/api/reports/weekly')
def get_weekly_report(week: int = 4, zone: str = None, authority: str = None, db: Session = Depends(get_db)):
    pdf_path = generate_weekly_pdf(week, db, zone, authority)
    if not os.path.exists(pdf_path):
        raise HTTPException(500, "Failed to generate report")
    return FileResponse(
        pdf_path,
        media_type='application/pdf',
        filename=f'roadpulse_weekly_w{week}.pdf'
    )

@router.post('/api/reports/generate')
def generate_report_post(week: int = Query(4), db: Session = Depends(get_db)):
    pdf_path = generate_weekly_pdf(week, db)
    filename = os.path.basename(pdf_path)
    return {
        "success": True,
        "filename": filename,
        "url": f"/reports/{filename}",
        "download_url": f"/api/reports/weekly?week={week}"
    }

@router.get('/api/exports/csv')
def get_csv_export(type: str, week: int = None, db: Session = Depends(get_db)):
    file_path = None
    if type == 'detections':
        file_path = export_detections_csv(db, week)
    elif type == 'road_segments':
        file_path = export_road_segments_csv(db)
    elif type == 'weekly_history':
        file_path = export_weekly_history_csv(db)
    elif type == 'authority_actions':
        file_path = export_authority_actions_csv(db)
    elif type == 'processing_jobs':
        file_path = export_processing_jobs_csv(db)
    else:
        raise HTTPException(400, f"Invalid export type '{type}'. Valid types: detections, road_segments, weekly_history, authority_actions, processing_jobs")
        
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(500, "Failed to generate CSV export")
        
    def iterfile():
        with open(file_path, mode="rb") as file_like:
            yield from file_like

    return StreamingResponse(
        iterfile(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={os.path.basename(file_path)}"}
    )
