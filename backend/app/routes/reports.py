"""
Report generation routes
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Event, Alert, Report
from app.schemas import ReportRequest, ReportResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import uuid
import os
from io import BytesIO

router = APIRouter()

@router.post("/users/{user_id}/reports", response_model=ReportResponse)
async def generate_report(user_id: str, request: ReportRequest, db: Session = Depends(get_db)):
    """Generate and return PDF health report"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=request.period_days)
    
    # Get report data
    events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= period_start,
        Event.timestamp <= period_end
    ).all()
    
    alerts = db.query(Alert).filter(
        Alert.user_id == user_id,
        Alert.timestamp >= period_start,
        Alert.timestamp <= period_end
    ).all()
    
    # Generate PDF
    pdf_data = _generate_pdf(user, events, alerts, period_start, period_end)
    
    # Save report
    report_id = str(uuid.uuid4())
    file_path = f"reports/{report_id}.pdf"
    os.makedirs("reports", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(pdf_data.getvalue())
    
    # Save to DB
    report = Report(
        id=report_id,
        user_id=user_id,
        period_start=period_start,
        period_end=period_end,
        period_days=request.period_days,
        file_path=file_path,
        pdf_url=f"/files/{report_id}.pdf",
        generated_at=datetime.utcnow()
    )
    
    db.add(report)
    db.commit()
    
    return report

@router.get("/reports/{report_id}/download")
async def download_report(report_id: str, db: Session = Depends(get_db)):
    """Download PDF report"""
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    return FileResponse(
        path=report.file_path,
        filename=f"health_report_{report.period_end.strftime('%Y-%m-%d')}.pdf",
        media_type="application/pdf"
    )

def _generate_pdf(user, events, alerts, period_start, period_end):
    """Generate PDF document"""
    
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=1
    )
    story.append(Paragraph("Health Summary Report", title_style))
    
    # Patient Info
    info_data = [
        ["Patient Name", user.name],
        ["Email", user.email],
        ["Report Period", f"{period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}"],
        ["Generated", datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')]
    ]
    
    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Events Summary
    story.append(Paragraph("Event Summary", styles['Heading2']))
    
    vitals = [e for e in events if e.type == "vital"]
    symptoms = [e for e in events if e.type == "symptom"]
    meds = [e for e in events if e.type == "medication"]
    
    summary_data = [
        ["Metric", "Count"],
        ["Total Vitals Logged", str(len(vitals))],
        ["Total Symptoms Logged", str(len(symptoms))],
        ["Medication Events", str(len(meds))],
        ["Total Alerts", str(len(alerts))]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Alerts
    if alerts:
        story.append(Paragraph("Alerts", styles['Heading2']))
        
        alert_data = [["Date", "Level", "Reason"]]
        for alert in alerts[:10]:  # Show first 10
            alert_data.append([
                alert.timestamp.strftime('%Y-%m-%d %H:%M'),
                alert.level.upper(),
                ', '.join(alert.reason_codes[:2])
            ])
        
        alert_table = Table(alert_data)
        alert_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        
        story.append(alert_table)
        story.append(Spacer(1, 0.3*inch))
    
    # Recommendation
    story.append(Paragraph("Recommendation", styles['Heading2']))
    recommendation = Paragraph(
        "Please consult your doctor with this report for professional medical advice.",
        styles['Normal']
    )
    story.append(recommendation)
    
    # Build PDF
    doc.build(story)
    pdf_buffer.seek(0)
    
    return pdf_buffer
