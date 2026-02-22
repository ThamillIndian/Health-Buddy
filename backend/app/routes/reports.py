"""
Report generation routes
Uses clinical standards from WHO, IDA, and ESC/ESH guidelines
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models import User, Event, Alert, Report, Medication, AdherenceLog
from app.schemas import ReportRequest, ReportResponse
from app.constants.clinical_standards import CLINICAL_DISCLAIMER
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import uuid
import os
from io import BytesIO
from collections import defaultdict

router = APIRouter()

@router.post("/users/{user_id}/reports", response_model=ReportResponse)
async def generate_report(user_id: str, request: ReportRequest, db: Session = Depends(get_db)):
    """Generate and return PDF health report"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=request.period_days)
    
    # Get comprehensive report data
    events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= period_start,
        Event.timestamp <= period_end
    ).order_by(Event.timestamp.asc()).all()
    
    alerts = db.query(Alert).filter(
        Alert.user_id == user_id,
        Alert.timestamp >= period_start,
        Alert.timestamp <= period_end
    ).order_by(Alert.timestamp.desc()).all()
    
    medications = db.query(Medication).filter(
        Medication.user_id == user_id,
        Medication.active == True
    ).all()
    
    adherence_logs = db.query(AdherenceLog).filter(
        AdherenceLog.user_id == user_id,
        AdherenceLog.created_at >= period_start,
        AdherenceLog.created_at <= period_end
    ).all()
    
    # Generate enhanced PDF
    pdf_data = _generate_enhanced_pdf(
        user, events, alerts, medications, adherence_logs, 
        period_start, period_end, request.period_days
    )
    
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

@router.get("/users/{user_id}/reports", response_model=List[ReportResponse])
async def get_user_reports(user_id: str, db: Session = Depends(get_db)):
    """Get all reports for a user, ordered by most recent first"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reports = db.query(Report).filter(
        Report.user_id == user_id
    ).order_by(Report.generated_at.desc()).all()
    
    return reports

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

@router.get("/reports/{report_id}/pdf")
async def get_report_pdf(report_id: str, db: Session = Depends(get_db)):
    """Get PDF report (alias for download)"""
    
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

def _generate_enhanced_pdf(user, events, alerts, medications, adherence_logs, 
                           period_start, period_end, period_days):
    """Generate comprehensive, visual PDF document"""
    
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, 
                          rightMargin=0.75*inch, leftMargin=0.75*inch,
                          topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # ========== COVER PAGE ==========
    # Title with gradient effect
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=1,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=40,
        alignment=1
    )
    
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("Health Summary Report", title_style))
    story.append(Paragraph(f"Comprehensive Analysis • {period_days} Day Period", subtitle_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Patient Info Box
    info_data = [
        ["Patient Name", user.name],
        ["Email", user.email],
        ["Report Period", f"{period_start.strftime('%B %d, %Y')} to {period_end.strftime('%B %d, %Y')}"],
        ["Generated", datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')]
    ]
    
    info_table = Table(info_data, colWidths=[2.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')])
    ]))
    
    story.append(info_table)
    story.append(PageBreak())
    
    # ========== EXECUTIVE SUMMARY ==========
    story.append(Paragraph("Executive Summary", styles['Heading1']))
    story.append(Spacer(1, 0.2*inch))
    
    # Calculate comprehensive metrics
    vitals = [e for e in events if e.type == "vital"]
    symptoms = [e for e in events if e.type == "symptom"]
    med_events = [e for e in events if e.type == "medication"]
    
    # Calculate adherence
    total_med_events = len(med_events)
    taken_events = len([e for e in med_events if e.payload.get("action") == "taken"])
    adherence_pct = (taken_events / max(total_med_events, 1)) * 100
    
    # BP Analysis
    bp_readings = []
    for event in vitals:
        payload = event.payload
        if payload.get("bp"):
            bp_str = payload.get("bp", "")
            if "/" in bp_str:
                try:
                    systolic, diastolic = bp_str.split("/")
                    bp_readings.append({
                        "systolic": int(systolic.strip()),
                        "diastolic": int(diastolic.strip()),
                        "date": event.timestamp,
                        "bp": bp_str
                    })
                except:
                    pass
    
    # Glucose Analysis
    glucose_readings = []
    for event in vitals:
        payload = event.payload
        if payload.get("glucose") is not None:
            glucose_value = payload.get("glucose")
            if isinstance(glucose_value, (int, float)) and glucose_value > 0:
                glucose_readings.append({
                    "value": float(glucose_value),
                    "date": event.timestamp
                })
    
    # Peak Flow Analysis
    peak_flow_readings = []
    for event in vitals:
        payload = event.payload
        if payload.get("peak_flow") is not None:
            peak_flow_value = payload.get("peak_flow")
            if isinstance(peak_flow_value, (int, float)) and peak_flow_value > 0:
                peak_flow_readings.append({
                    "value": float(peak_flow_value),
                    "date": event.timestamp
                })
    
    avg_glucose = sum([g["value"] for g in glucose_readings]) / len(glucose_readings) if glucose_readings else None
    avg_peak_flow = sum([p["value"] for p in peak_flow_readings]) / len(peak_flow_readings) if peak_flow_readings else None
    latest_bp = bp_readings[-1]["bp"] if bp_readings else "N/A"
    
    # Risk Level from alerts
    risk_level = "Green"
    if alerts:
        latest_alert = alerts[0]
        risk_level = latest_alert.level.capitalize()
    
    # Status indicators
    adherence_status = "✅ Excellent" if adherence_pct >= 95 else "⚠️ Good" if adherence_pct >= 80 else "❌ Needs Improvement"
    risk_status = "🟢 Low Risk" if risk_level == "Green" else "🟡 Medium Risk" if risk_level == "Amber" else "🔴 High Risk"
    
    summary_data = [
        ["Metric", "Value", "Status"],
        ["Medication Adherence", f"{adherence_pct:.1f}%", adherence_status],
        ["Total Vitals Logged", str(len(vitals)), "📊"],
        ["Blood Pressure (Latest)", latest_bp, "🩺"],
        ["Glucose (Average)", f"{avg_glucose:.1f} mg/dL" if avg_glucose else "N/A", "📈"],
        ["Peak Flow (Average)", f"{avg_peak_flow:.1f} L/min" if avg_peak_flow else "N/A", "🫁"],
        ["Symptoms Reported", str(len(symptoms)), "🤒"],
        ["Active Medications", str(len(medications)), "💊"],
        ["Alerts Generated", str(len(alerts)), risk_status]
    ]
    
    summary_table = Table(summary_data, colWidths=[2.5*inch, 2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # ========== VITALS HISTORY ==========
    story.append(Paragraph("Vitals History", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    if vitals:
        # Detailed vitals table
        vitals_data = [["Date & Time", "Type", "Value", "Status"]]
        
        for event in vitals[-20:]:  # Last 20 readings
            payload = event.payload
            timestamp = event.timestamp.strftime('%Y-%m-%d %H:%M')
            
            vital_type = "Unknown"
            value = "N/A"
            status = "✅"
            
            if payload.get("bp"):
                vital_type = "Blood Pressure"
                value = payload.get("bp")
                # Check if BP is normal
                try:
                    sys, dia = value.split("/")
                    if int(sys.strip()) > 140 or int(dia.strip()) > 90:
                        status = "⚠️"
                except:
                    pass
            elif payload.get("glucose") is not None:
                vital_type = "Glucose"
                value = f"{payload.get('glucose')} mg/dL"
                glucose_val = payload.get("glucose")
                if isinstance(glucose_val, (int, float)):
                    if glucose_val > 180:
                        status = "🔴"
                    elif glucose_val > 140:
                        status = "🟡"
                    else:
                        status = "✅"
            elif payload.get("peak_flow") is not None:
                vital_type = "Peak Flow"
                value = f"{payload.get('peak_flow')} L/min"
                peak_flow_val = payload.get("peak_flow")
                if isinstance(peak_flow_val, (int, float)):
                    # Normal peak flow varies by age/height, but generally:
                    # < 80% of personal best or < 200 L/min for adults is concerning
                    if peak_flow_val < 200:
                        status = "🟡"
                    elif peak_flow_val < 150:
                        status = "🔴"
                    else:
                        status = "✅"
            elif payload.get("weight"):
                vital_type = "Weight"
                value = f"{payload.get('weight')} kg"
            
            vitals_data.append([timestamp, vital_type, value, status])
        
        vitals_table = Table(vitals_data, colWidths=[1.8*inch, 1.5*inch, 1.5*inch, 1*inch])
        vitals_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        
        story.append(vitals_table)
    else:
        story.append(Paragraph("No vitals logged during this period.", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(PageBreak())
    
    # ========== MEDICATION ADHERENCE ==========
    story.append(Paragraph("Medication Adherence", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    if medications:
        med_data = [["Medication", "Strength", "Frequency", "Adherence", "Status"]]
        
        for med in medications:
            # Calculate adherence for this medication
            med_logs = [log for log in adherence_logs if log.med_id == med.id]
            med_events_for_med = [e for e in med_events if e.payload.get("medication_id") == med.id]
            
            total_expected = len(med_events_for_med)
            total_taken = len([e for e in med_events_for_med if e.payload.get("action") == "taken"])
            med_adherence = (total_taken / max(total_expected, 1)) * 100 if total_expected > 0 else 0
            
            status = "✅ Excellent" if med_adherence >= 95 else "⚠️ Good" if med_adherence >= 80 else "❌ Poor"
            
            med_data.append([
                med.name,
                med.strength or "N/A",
                med.frequency or "N/A",
                f"{med_adherence:.1f}%",
                status
            ])
        
        med_table = Table(med_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1*inch, 1.3*inch])
        med_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')])
        ]))
        
        story.append(med_table)
    else:
        story.append(Paragraph("No active medications found.", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Medication Events Timeline
    if med_events:
        story.append(Paragraph("Medication Events Timeline", styles['Heading3']))
        story.append(Spacer(1, 0.1*inch))
        
        timeline_data = [["Date & Time", "Medication", "Action", "Source"]]
        
        for event in med_events[-15:]:  # Last 15 events
            payload = event.payload
            timestamp = event.timestamp.strftime('%Y-%m-%d %H:%M')
            med_name = payload.get("medication_name")
            
            # If medication_name is missing, look it up from medication_id
            if not med_name or med_name == "Unknown":
                med_id = payload.get("medication_id")
                if med_id:
                    # Find medication by ID
                    med = next((m for m in medications if m.id == med_id), None)
                    med_name = med.name if med else "Unknown"
                else:
                    med_name = "Unknown"
            
            action = payload.get("action", "unknown").capitalize()
            source = event.source.capitalize()
            
            timeline_data.append([timestamp, med_name, action, source])
        
        timeline_table = Table(timeline_data, colWidths=[1.8*inch, 2*inch, 1*inch, 1*inch])
        timeline_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey)
        ]))
        
        story.append(timeline_table)
    
    story.append(Spacer(1, 0.3*inch))
    
    # ========== UN-TAKEN / MISSED MEDICATIONS ==========
    story.append(Paragraph("Un-taken & Missed Medications", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    # Get missed/pending medications from adherence logs
    missed_logs = [log for log in adherence_logs 
                   if log.status in ["missed", "pending"] 
                   and log.scheduled_time <= period_end]
    
    # Also check medications that haven't been taken today
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_med_events = [e for e in med_events 
                        if e.timestamp >= today_start 
                        and e.payload.get("action") == "taken"]
    taken_med_ids = set([e.payload.get("medication_id") for e in today_med_events if e.payload.get("medication_id")])
    
    # Find medications not taken today (but only if they're active and should be taken)
    untaken_meds = []
    for med in medications:
        if med.id not in taken_med_ids:
            # Check if this medication should have been taken today based on schedule
            med_logs_today = [log for log in adherence_logs 
                             if log.med_id == med.id 
                             and log.scheduled_time.date() == today
                             and log.status in ["pending", "missed"]]
            if med_logs_today:
                untaken_meds.append(med)
    
    if missed_logs or untaken_meds:
        missed_data = [["Medication", "Strength", "Scheduled Time", "Status", "Days Overdue"]]
        
        # Add missed logs
        for log in missed_logs[:30]:  # Last 30 missed
            med = next((m for m in medications if m.id == log.med_id), None)
            if med:
                scheduled = log.scheduled_time.strftime('%Y-%m-%d %H:%M')
                days_overdue = (datetime.utcnow() - log.scheduled_time).days if log.scheduled_time < datetime.utcnow() else 0
                status = "🔴 Missed" if log.status == "missed" else "🟡 Pending"
                
                missed_data.append([
                    med.name,
                    med.strength or "N/A",
                    scheduled,
                    status,
                    f"{days_overdue} days" if days_overdue > 0 else "Today"
                ])
        
        # Add un-taken medications (not taken today)
        for med in untaken_meds:
            if med.id not in [log.med_id for log in missed_logs]:  # Avoid duplicates
                missed_data.append([
                    med.name,
                    med.strength or "N/A",
                    "Today",
                    "🟡 Not Taken",
                    "0 days"
                ])
        
        if len(missed_data) > 1:  # More than just header
            missed_table = Table(missed_data, colWidths=[2*inch, 1*inch, 1.5*inch, 1*inch, 1*inch])
            missed_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef2f2')])
            ]))
            
            story.append(missed_table)
        else:
            story.append(Paragraph("✅ All medications have been taken on schedule.", styles['Normal']))
    else:
        story.append(Paragraph("✅ All medications have been taken on schedule.", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(PageBreak())
    
    # ========== SYMPTOMS ANALYSIS ==========
    story.append(Paragraph("Symptoms Analysis", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    if symptoms:
        # Symptom frequency
        symptom_freq = defaultdict(int)
        symptom_severity = defaultdict(list)
        
        for event in symptoms:
            payload = event.payload
            symptom_name = payload.get("name", "Unknown")
            severity = payload.get("severity", 0)
            symptom_freq[symptom_name] += 1
            symptom_severity[symptom_name].append(severity)
        
        symptom_data = [["Symptom", "Frequency", "Avg Severity", "Last Occurrence"]]
        
        for symptom, count in sorted(symptom_freq.items(), key=lambda x: x[1], reverse=True):
            avg_severity = sum(symptom_severity[symptom]) / len(symptom_severity[symptom]) if symptom_severity[symptom] else 0
            # Find last occurrence
            last_event = [e for e in symptoms if e.payload.get("name") == symptom][-1]
            last_date = last_event.timestamp.strftime('%Y-%m-%d')
            
            severity_text = f"{avg_severity:.1f}/5"
            if avg_severity >= 4:
                severity_text += " 🔴"
            elif avg_severity >= 3:
                severity_text += " 🟡"
            else:
                severity_text += " 🟢"
            
            symptom_data.append([symptom, str(count), severity_text, last_date])
        
        symptom_table = Table(symptom_data, colWidths=[2*inch, 1.2*inch, 1.5*inch, 1.3*inch])
        symptom_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fffbeb')])
        ]))
        
        story.append(symptom_table)
    else:
        story.append(Paragraph("No symptoms reported during this period.", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    
    # ========== DAILY BREAKDOWN ==========
    story.append(Paragraph("Daily Activity Breakdown", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    # Group events by date
    daily_events = defaultdict(lambda: {"vitals": 0, "symptoms": 0, "medications": 0})
    
    for event in events:
        date_key = event.timestamp.strftime('%Y-%m-%d')
        if event.type == "vital":
            daily_events[date_key]["vitals"] += 1
        elif event.type == "symptom":
            daily_events[date_key]["symptoms"] += 1
        elif event.type == "medication":
            daily_events[date_key]["medications"] += 1
    
    daily_data = [["Date", "Vitals", "Symptoms", "Medications", "Total"]]
    
    for date in sorted(daily_events.keys(), reverse=True)[:14]:  # Last 14 days
        day_data = daily_events[date]
        total = day_data["vitals"] + day_data["symptoms"] + day_data["medications"]
        daily_data.append([
            datetime.strptime(date, '%Y-%m-%d').strftime('%b %d, %Y'),
            str(day_data["vitals"]),
            str(day_data["symptoms"]),
            str(day_data["medications"]),
            str(total)
        ])
    
    daily_table = Table(daily_data, colWidths=[1.8*inch, 1*inch, 1*inch, 1.2*inch, 1*inch])
    daily_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#eef2ff')])
    ]))
    
    story.append(daily_table)
    story.append(Spacer(1, 0.3*inch))
    story.append(PageBreak())
    
    # ========== ALERTS ==========
    if alerts:
        story.append(Paragraph("Health Alerts & Risk Assessment", styles['Heading2']))
        story.append(Spacer(1, 0.2*inch))
        
        alert_data = [["Date & Time", "Level", "Risk Score", "Reasons"]]
        
        for alert in alerts[:15]:  # Last 15 alerts
            timestamp = alert.timestamp.strftime('%Y-%m-%d %H:%M')
            level = alert.level.upper()
            
            # Color code level
            if level == "RED":
                level = f"🔴 {level}"
            elif level == "AMBER":
                level = f"🟡 {level}"
            else:
                level = f"🟢 {level}"
            
            reasons = ', '.join(alert.reason_codes[:3]) if alert.reason_codes else "N/A"
            if len(alert.reason_codes) > 3:
                reasons += "..."
            
            alert_data.append([timestamp, level, f"{alert.score:.1f}", reasons])
        
        alert_table = Table(alert_data, colWidths=[1.8*inch, 1.2*inch, 1*inch, 2*inch])
        alert_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef2f2')])
        ]))
        
        story.append(alert_table)
        story.append(Spacer(1, 0.3*inch))
    
    # ========== ENHANCED RECOMMENDATIONS ==========
    story.append(Paragraph("Personalized Recommendations & Insights", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    recommendations = []
    
    # Medication-specific recommendations
    if missed_logs:
        missed_count = len(missed_logs)
        recommendations.append(f"⚠️ {missed_count} medication dose(s) were missed or pending. Consider setting up reminders or using a pill organizer to improve adherence.")
    
    if adherence_pct < 80:
        recommendations.append("⚠️ Medication adherence is below optimal (WHO recommends >80%). Consider discussing with your doctor about simplifying your medication schedule or using reminder tools.")
    elif adherence_pct < 95:
        recommendations.append("✅ Good medication adherence. Aim for >95% for optimal health outcomes (WHO standard). Small improvements can significantly impact your health.")
    else:
        recommendations.append("✅ Excellent medication adherence! You're meeting WHO's optimal standard of >95%. Keep up the great work!")
    
    # Vitals-specific recommendations
    if glucose_readings:
        avg_glucose = sum([g["value"] for g in glucose_readings]) / len(glucose_readings)
        if avg_glucose > 180:
            recommendations.append("🔴 Average glucose is elevated (>180 mg/dL per IDA guidelines). This may indicate poor diabetes control. Consult your doctor immediately and review your diet and medication.")
        elif avg_glucose > 140:
            recommendations.append("🟡 Average glucose is slightly elevated (140-180 mg/dL per IDA guidelines). Monitor closely, maintain regular meal times, and consider dietary adjustments. Discuss with your doctor.")
        elif avg_glucose < 70:
            recommendations.append("⚠️ Average glucose is low (<70 mg/dL). Watch for hypoglycemia symptoms (dizziness, sweating, confusion) and discuss with your doctor about adjusting medication timing or dosage.")
        else:
            recommendations.append("✅ Glucose levels are within normal range (70-140 mg/dL per IDA guidelines). Continue monitoring and maintaining your current routine.")
    
    if bp_readings:
        avg_systolic = sum([b["systolic"] for b in bp_readings]) / len(bp_readings)
        avg_diastolic = sum([b["diastolic"] for b in bp_readings]) / len(bp_readings)
        
        if avg_systolic > 160 or avg_diastolic > 100:
            recommendations.append("🔴 Blood pressure is critically high (Stage 2 Hypertension per ESC/ESH guidelines). Seek immediate medical attention and avoid delaying treatment.")
        elif avg_systolic > 140 or avg_diastolic > 90:
            recommendations.append("⚠️ Blood pressure is elevated (Stage 1 Hypertension: 140-159/90-99 mmHg per ESC/ESH guidelines). Monitor regularly, reduce sodium intake, increase physical activity, and discuss with your doctor.")
        else:
            recommendations.append("✅ Blood pressure is within normal range (<140/90 mmHg per ESC/ESH guidelines). Continue maintaining a healthy lifestyle with regular exercise and balanced diet.")
    
    # Peak Flow recommendations
    if peak_flow_readings:
        avg_peak_flow = sum([p["value"] for p in peak_flow_readings]) / len(peak_flow_readings)
        if avg_peak_flow < 150:
            recommendations.append("🔴 Peak flow is low (<150 L/min). This may indicate asthma exacerbation or respiratory issues. Consult your doctor immediately and ensure you're using your inhaler correctly.")
        elif avg_peak_flow < 200:
            recommendations.append("🟡 Peak flow is below normal (150-200 L/min). Monitor closely, ensure proper inhaler technique, and discuss with your doctor if this persists.")
        else:
            recommendations.append("✅ Peak flow is within normal range (≥200 L/min). Continue your current asthma management plan.")
    
    # Symptom-specific recommendations
    if symptoms:
        critical_symptoms = [s for s in symptoms if s.payload.get("severity", 0) >= 3]
        if critical_symptoms:
            recommendations.append("🚨 Critical symptoms (severity ≥3) were reported during this period. Please seek immediate medical attention if symptoms persist or worsen.")
        
        # Calculate symptom frequency for recommendations
        symptom_freq_rec = defaultdict(int)
        for event in symptoms:
            symptom_name = event.payload.get("name", "Unknown")
            symptom_freq_rec[symptom_name] += 1
        
        frequent_symptoms = [name for name, count in symptom_freq_rec.items() if count >= 3]
        if frequent_symptoms:
            recommendations.append(f"📊 Frequent symptoms detected: {', '.join(frequent_symptoms)}. Consider discussing symptom patterns and triggers with your healthcare provider.")
    
    # Trend-based recommendations
    if bp_readings and len(bp_readings) >= 3:
        recent_bp = bp_readings[-3:]
        older_bp = bp_readings[:-3] if len(bp_readings) > 3 else []
        if older_bp:
            recent_avg = sum([b["systolic"] for b in recent_bp]) / len(recent_bp)
            older_avg = sum([b["systolic"] for b in older_bp]) / len(older_bp)
            if recent_avg > older_avg + 10:
                recommendations.append("📈 Blood pressure shows an increasing trend over time. Monitor closely, review lifestyle factors (stress, diet, exercise), and discuss with your doctor.")
            elif recent_avg < older_avg - 10:
                recommendations.append("📉 Blood pressure shows a decreasing trend. This is positive! Continue your current management plan.")
    
    if glucose_readings and len(glucose_readings) >= 3:
        recent_glucose = glucose_readings[-3:]
        older_glucose = glucose_readings[:-3] if len(glucose_readings) > 3 else []
        if older_glucose:
            recent_avg = sum([g["value"] for g in recent_glucose]) / len(recent_glucose)
            older_avg = sum([g["value"] for g in older_glucose]) / len(older_glucose)
            if recent_avg > older_avg + 20:
                recommendations.append("📈 Glucose levels show an increasing trend. Review your diet, medication timing, and discuss with your doctor.")
            elif recent_avg < older_avg - 20:
                recommendations.append("📉 Glucose levels show a decreasing trend. Great progress! Continue monitoring and maintain your current routine.")
    
    # Activity-based recommendations
    total_events = len(events)
    if total_events < 5:
        recommendations.append("📝 Low activity logging detected. Regular tracking helps identify patterns and improves health outcomes. Try logging at least one vital or symptom daily.")
    elif total_events > 50:
        recommendations.append("✅ Excellent health tracking! Your consistent logging provides valuable insights for your healthcare team. Keep up the great work!")
    
    # General health recommendations
    if not recommendations:
        recommendations.append("✅ Your health metrics are within normal ranges. Continue maintaining your current routine with regular exercise, balanced diet, and medication adherence.")
    else:
        recommendations.append("💡 Remember: This report is for informational purposes only. Always consult your healthcare provider for medical decisions and treatment adjustments.")
    
    recommendations.append("📋 Please share this report with your doctor during your next visit for comprehensive review and personalized medical guidance.")
    
    # Format recommendations with better styling
    rec_style = ParagraphStyle(
        'RecommendationStyle',
        parent=styles['Normal'],
        fontSize=10,
        leftIndent=15,
        spaceAfter=8,
        bulletIndent=10
    )
    
    for rec in recommendations:
        story.append(Paragraph(f"• {rec}", rec_style))
        story.append(Spacer(1, 0.1*inch))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(PageBreak())
    
    # ========== CLINICAL DISCLAIMER ==========
    story.append(Paragraph("Clinical Data Sources & Disclaimer", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    disclaimer_style = ParagraphStyle(
        'DisclaimerStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#666666'),
        leftIndent=10,
        rightIndent=10,
        spaceAfter=10
    )
    
    disclaimer_text = CLINICAL_DISCLAIMER.replace('\n', '<br/>')
    story.append(Paragraph(disclaimer_text, disclaimer_style))
    
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("Clinical References Used", styles['Heading3']))
    
    references_data = [
        ["Standard", "Source", "URL"],
        ["Glucose Range", "IDA (Indian Diabetes Association)", "https://www.indiandiabetics.org"],
        ["Blood Pressure", "ESC/ESH (European Guidelines)", "https://www.escardio.org"],
        ["Medication Adherence", "WHO (World Health Organization)", "https://www.who.int"],
        ["Risk Scoring", "Clinical Risk Assessment Framework", "N/A"]
    ]
    
    ref_table = Table(references_data, colWidths=[1.8*inch, 2.2*inch, 2*inch])
    ref_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9ca3af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey)
    ]))
    
    story.append(ref_table)
    
    # Build PDF
    doc.build(story)
    pdf_buffer.seek(0)
    
    return pdf_buffer
