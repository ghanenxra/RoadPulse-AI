import os
import csv
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy.orm import Session
from models.database import RoadSegment, Detection, WeeklyRoadMetric, IssueReport, ProcessingJob, Authority

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'reports')

def generate_weekly_pdf(week: int, db: Session, zone: str = None, authority: str = None) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    file_path = os.path.join(REPORTS_DIR, f"weekly_report_w{week}.pdf")
    
    # Query Database Data
    segments = db.query(RoadSegment).all()
    metrics = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == week).all()
    metric_map = {m.segment_id: m for m in metrics}
    authorities = {a.authority_id: a for a in db.query(Authority).all()}
    issues = db.query(IssueReport).all()
    
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=20,
        textColor=colors.HexColor('#0f172a')
    )
    sub_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569')
    )
    banner_style = ParagraphStyle(
        'BannerText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#854d0e')
    )
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    header_cell = ParagraphStyle(
        'HeaderCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )
    
    story = []
    
    # Title Header
    story.append(Paragraph('ROADPULSE AI — MUNICIPAL ROAD HEALTH AUDIT', title_style))
    gen_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    story.append(Paragraph(
        f'Weekly Condition Assessment &amp; SLA Accountability Dossier | Survey Cycle: <b>Week {week}</b> | Generated: {gen_time} | Zone: Jaipur Urban Area',
        sub_style
    ))
    story.append(Spacer(1, 8))
    
    # Disclaimer Banner
    banner_table = Table(
        [[Paragraph('<b>SIMULATED DEMO DATA:</b> Prepared for National Inter-University Innovation Challenge (IS2603). Synthesized municipal dataset across 4 survey cycles for Jaipur, India.', banner_style)]],
        colWidths=[540]
    )
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef9c3')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#eab308')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 10))
    
    # Executive KPI Summary Table
    total_roads = len(segments)
    total_potholes = sum(m.pothole_count for m in metrics)
    avg_risk = sum(m.risk_score for m in metrics) / total_roads if total_roads else 0.0
    critical_count = sum(1 for m in metrics if m.grade in ['D', 'E'])
    
    kpi_data = [
        [
            Paragraph('Total Surveyed Corridors', header_cell),
            Paragraph('Total Potholes Detected', header_cell),
            Paragraph('Citywide Avg Risk Index', header_cell),
            Paragraph('Critical Corridors (D/E)', header_cell)
        ],
        [
            Paragraph(f'<b>{total_roads}</b> Segments (21.4 km)', cell_style),
            Paragraph(f'<b>{total_potholes}</b> Verified Potholes', cell_style),
            Paragraph(f'<b>{avg_risk:.1f}</b> / 100', cell_style),
            Paragraph(f'<b>{critical_count}</b> Action Required', cell_style)
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))
    
    # Grade Distribution Table
    story.append(Paragraph('<b>Network Condition &amp; Grade Distribution</b>', styles['Heading3']))
    story.append(Spacer(1, 3))
    
    grade_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
    for m in metrics:
        if m.grade in grade_counts:
            grade_counts[m.grade] += 1
            
    grade_rows = [
        [
            Paragraph('Grade', header_cell),
            Paragraph('Classification', header_cell),
            Paragraph('Risk Index Band', header_cell),
            Paragraph('Corridors', header_cell),
            Paragraph('Share of Network', header_cell),
            Paragraph('Standard SLA Recommended Action', header_cell)
        ],
        [
            Paragraph('<b>Grade A</b>', cell_bold), Paragraph('Good Condition', cell_style), Paragraph('0 – 20', cell_style),
            Paragraph(str(grade_counts['A']), cell_style), Paragraph(f'{(grade_counts["A"]/total_roads*100):.1f}%', cell_style), Paragraph('Routine bi-weekly optical surveillance', cell_style)
        ],
        [
            Paragraph('<b>Grade B</b>', cell_bold), Paragraph('Fair Condition', cell_style), Paragraph('21 – 40', cell_style),
            Paragraph(str(grade_counts['B']), cell_style), Paragraph(f'{(grade_counts["B"]/total_roads*100):.1f}%', cell_style), Paragraph('Preventative seal coat monitoring', cell_style)
        ],
        [
            Paragraph('<b>Grade C</b>', cell_bold), Paragraph('Moderate Wear', cell_style), Paragraph('41 – 60', cell_style),
            Paragraph(str(grade_counts['C']), cell_style), Paragraph(f'{(grade_counts["C"]/total_roads*100):.1f}%', cell_style), Paragraph('Schedule patch works within 30 days', cell_style)
        ],
        [
            Paragraph('<b>Grade D</b>', cell_bold), Paragraph('Poor / Deteriorating', cell_style), Paragraph('61 – 80', cell_style),
            Paragraph(str(grade_counts['D']), cell_style), Paragraph(f'{(grade_counts["D"]/total_roads*100):.1f}%', cell_style), Paragraph('Issue dispatch to municipal contractor (14-day SLA)', cell_style)
        ],
        [
            Paragraph('<b>Grade E</b>', cell_bold), Paragraph('Critical / Dangerous', cell_style), Paragraph('81 – 100', cell_style),
            Paragraph(str(grade_counts['E']), cell_style), Paragraph(f'{(grade_counts["E"]/total_roads*100):.1f}%', cell_style), Paragraph('EMERGENCY: Cold mix repair within 72 hours', cell_style)
        ],
    ]
    grade_table = Table(grade_rows, colWidths=[55, 95, 75, 55, 75, 185])
    grade_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(grade_table)
    story.append(Spacer(1, 12))
    
    # Priority Road Segments Inventory Table
    story.append(Paragraph('<b>Priority Road Segment Inventory &amp; Condition Ledger</b>', styles['Heading3']))
    story.append(Spacer(1, 3))
    
    sorted_segments = sorted(
        segments,
        key=lambda s: metric_map.get(s.segment_id).risk_score if metric_map.get(s.segment_id) else 0,
        reverse=True
    )
    
    road_rows = [
        [
            Paragraph('ID', header_cell),
            Paragraph('Road Name &amp; Stretch', header_cell),
            Paragraph('Ward &amp; Authority', header_cell),
            Paragraph('Potholes', header_cell),
            Paragraph('Depth', header_cell),
            Paragraph('Risk', header_cell),
            Paragraph('Grade', header_cell),
            Paragraph('SLA Status', header_cell)
        ]
    ]
    
    for seg in sorted_segments:
        m = metric_map.get(seg.segment_id)
        if not m:
            continue
        auth = authorities.get(seg.authority_id)
        auth_name = auth.name.replace('Jaipur Municipal Corporation', 'JMC') if auth else seg.authority_id
        status_display = m.status.upper().replace('_', ' ') if m.status else "NONE"
        
        road_rows.append([
            Paragraph(seg.segment_id, cell_bold),
            Paragraph(f'<b>{seg.road_name}</b><br/>{seg.sub_name}', cell_style),
            Paragraph(f'{seg.ward}<br/>{auth_name}', cell_style),
            Paragraph(str(m.pothole_count), cell_style),
            Paragraph(f'{m.depth_avg_cm:.1f} cm', cell_style),
            Paragraph(f'{m.risk_score:.1f}', cell_bold),
            Paragraph(f'<b>Grade {m.grade}</b>', cell_bold),
            Paragraph(status_display, cell_style)
        ])
        
    road_table = Table(road_rows, colWidths=[45, 135, 125, 45, 45, 40, 45, 60])
    road_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(road_table)
    story.append(Spacer(1, 10))
    
    # Authority Accountability Overview Table
    story.append(Paragraph('<b>Municipal Authority Accountability &amp; SLA Overview</b>', styles['Heading3']))
    story.append(Spacer(1, 3))
    
    auth_rows = [
        [
            Paragraph('Authority Body', header_cell),
            Paragraph('Jurisdiction', header_cell),
            Paragraph('Assigned Corridors', header_cell),
            Paragraph('Active Issues', header_cell),
            Paragraph('Overdue SLA', header_cell),
            Paragraph('Compliance Status', header_cell)
        ]
    ]
    
    for auth_id, auth in authorities.items():
        auth_segs = [s for s in segments if s.authority_id == auth_id]
        auth_issues = [i for i in issues if i.authority_id == auth_id]
        overdue_cnt = sum(1 for i in auth_issues if i.status == 'overdue')
        comp_status = "Action Required" if overdue_cnt > 0 else "Compliant"
        
        auth_rows.append([
            Paragraph(auth.name, cell_bold),
            Paragraph(auth.zone or "Jaipur", cell_style),
            Paragraph(str(len(auth_segs)), cell_style),
            Paragraph(str(len(auth_issues)), cell_style),
            Paragraph(f'<font color="#dc2626"><b>{overdue_cnt}</b></font>' if overdue_cnt > 0 else "0", cell_style),
            Paragraph(comp_status, cell_style)
        ])
        
    auth_table = Table(auth_rows, colWidths=[150, 80, 70, 70, 70, 100])
    auth_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(auth_table)
    story.append(Spacer(1, 10))
    
    # Methodology & Verification Note
    method_text = (
        "<b>Auditing Methodology:</b> Condition scores are computed via RoadPulse AI Multi-Criteria Risk Formulation: "
        "<i>Risk Score = 0.40 × Severity + 0.25 × Density + 0.20 × Trend + 0.15 × Context</i>. "
        "Detections are captured through high-frequency public transit cameras, localized via GPS bounding-box interpolation, "
        "and deduplicated across successive sweeps. Post-repair validation requires an automated survey cycle verifying score reduction &gt; 40%."
    )
    story.append(Paragraph(method_text, sub_style))
    
    doc.build(story)
    return file_path

def _write_csv(filename: str, headers: list, rows: list) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    file_path = os.path.join(REPORTS_DIR, filename)
    with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["# SIMULATED DEMO DATA — RoadPulse AI Municipal Intelligence Platform"])
        writer.writerow(headers)
        writer.writerows(rows)
    return file_path

def export_detections_csv(db: Session, week: int = None) -> str:
    q = db.query(Detection)
    if week:
        q = q.filter(Detection.week == week)
    rows = []
    for d in q.all():
        rows.append([
            d.detection_id,
            d.road_segment_id,
            d.latitude,
            d.longitude,
            d.severity,
            d.severity_label,
            d.depth_cm or 0.0,
            d.confidence or 0.85,
            d.week,
            d.timestamp.isoformat() if d.timestamp else "N/A"
        ])
    return _write_csv(
        f"detections_w{week}.csv" if week else "detections_all.csv",
        ["detection_id", "road_segment_id", "latitude", "longitude", "severity", "severity_label", "depth_cm", "confidence", "week", "timestamp"],
        rows
    )

def export_road_segments_csv(db: Session) -> str:
    rows = []
    for r in db.query(RoadSegment).all():
        auth = db.query(Authority).filter(Authority.authority_id == r.authority_id).first()
        auth_name = auth.name if auth else r.authority_id
        # Get latest metric
        latest_m = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == r.segment_id).order_by(WeeklyRoadMetric.week.desc()).first()
        rows.append([
            r.segment_id,
            r.road_name,
            r.sub_name,
            r.length_km,
            r.ward,
            auth_name,
            latest_m.risk_score if latest_m else "N/A",
            latest_m.grade if latest_m else "N/A",
            latest_m.pothole_count if latest_m else "N/A",
            latest_m.status if latest_m else "none"
        ])
    return _write_csv(
        "road_segments.csv",
        ["segment_id", "road_name", "sub_name", "length_km", "ward", "authority", "current_risk_score", "current_grade", "current_potholes", "status"],
        rows
    )

def export_weekly_history_csv(db: Session) -> str:
    rows = []
    for m in db.query(WeeklyRoadMetric).order_by(WeeklyRoadMetric.segment_id, WeeklyRoadMetric.week).all():
        seg = db.query(RoadSegment).filter(RoadSegment.segment_id == m.segment_id).first()
        road_name = seg.road_name if seg else m.segment_id
        rows.append([
            m.segment_id,
            road_name,
            m.week,
            m.date,
            m.pothole_count,
            m.severity_avg,
            m.depth_avg_cm,
            m.rain_mm,
            m.trend,
            m.risk_score,
            m.grade,
            m.status or "none"
        ])
    return _write_csv(
        "weekly_history.csv",
        ["segment_id", "road_name", "week", "date", "pothole_count", "severity_avg", "depth_avg_cm", "rain_mm", "trend", "risk_score", "grade", "status"],
        rows
    )

def export_authority_actions_csv(db: Session) -> str:
    rows = []
    for i in db.query(IssueReport).all():
        auth = db.query(Authority).filter(Authority.authority_id == i.authority_id).first()
        auth_name = auth.name if auth else i.authority_id
        seg = db.query(RoadSegment).filter(RoadSegment.segment_id == i.segment_id).first()
        road_name = seg.road_name if seg else i.segment_id
        days_unres = (datetime.utcnow() - i.sent_at).days if i.sent_at else 0
        rows.append([
            i.issue_id,
            i.segment_id,
            road_name,
            auth_name,
            i.priority,
            i.risk_score,
            i.status,
            i.sent_at.strftime("%Y-%m-%d") if i.sent_at else "N/A",
            i.due_at.strftime("%Y-%m-%d") if i.due_at else "N/A",
            days_unres
        ])
    return _write_csv(
        "authority_actions.csv",
        ["issue_id", "segment_id", "road_name", "authority", "priority", "risk_score", "status", "sent_date", "due_date", "days_unresolved"],
        rows
    )

def export_processing_jobs_csv(db: Session) -> str:
    rows = []
    for j in db.query(ProcessingJob).all():
        rows.append([
            j.job_id,
            j.bus_id,
            j.source,
            j.status,
            j.progress,
            j.frames_total,
            j.frames_processed,
            j.detections_count,
            j.provider,
            j.created_at.strftime("%Y-%m-%d %H:%M") if j.created_at else "N/A"
        ])
    return _write_csv(
        "processing_jobs.csv",
        ["job_id", "bus_id", "source", "status", "progress_pct", "frames_total", "frames_processed", "detections_count", "provider", "created_at"],
        rows
    )
