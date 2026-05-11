"""
Seed script to generate 30 days of mock health data for demo user
Run: python seed_demo_data.py
"""
import os
import random
from datetime import datetime, timedelta
from uuid import UUID
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User, Medication, Event, AdherenceLog, Alert, DerivedDaily

load_dotenv()

# Configuration
USER_ID = "d8a77a02-9701-4d1b-8dc3-9d172b7191da"
DATABASE_URL = os.getenv("DATABASE_URL")
DAYS_TO_GENERATE = 30

# Connect to database
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("🚢 Starting mock data generation...")
print(f"📅 Generating data for last {DAYS_TO_GENERATE} days")
print(f"👤 User ID: {USER_ID}\n")

# Verify user exists
user_uuid = UUID(USER_ID)
user = db.query(User).filter(User.id == user_uuid).first()
if not user:
    print(f"❌ User with ID {USER_ID} not found!")
    exit(1)

print(f"✅ Found user: {user.name} ({user.email})")

# ============================================
# 1. CREATE MEDICATIONS
# ============================================
print("\n💊 Creating medications...")

medications_data = [
    {
        "name": "Amlodipine",
        "strength": "5mg",
        "category": "Blood Pressure",
        "frequency": "Once daily",
        "times": ["08:00"],
        "notes": "Take with breakfast"
    },
    {
        "name": "Metformin",
        "strength": "500mg",
        "category": "Diabetes",
        "frequency": "Twice daily",
        "times": ["08:00", "20:00"],
        "notes": "Take with meals"
    },
    {
        "name": "Atorvastatin",
        "strength": "20mg",
        "category": "Cholesterol",
        "frequency": "Once daily",
        "times": ["20:00"],
        "notes": "Take at bedtime"
    },
    {
        "name": "Aspirin",
        "strength": "75mg",
        "category": "Blood Thinner",
        "frequency": "Once daily",
        "times": ["08:00"],
        "notes": "Take after breakfast"
    }
]

created_meds = []
for med_data in medications_data:
    # Check if medication already exists
    existing = db.query(Medication).filter(
        Medication.user_id == user_uuid,
        Medication.name == med_data["name"]
    ).first()
    
    if not existing:
        medication = Medication(
            user_id=user_uuid,
            name=med_data["name"],
            strength=med_data["strength"],
            category=med_data["category"],
            frequency=med_data["frequency"],
            times=med_data["times"],
            active=True,
            notes=med_data["notes"]
        )
        db.add(medication)
        created_meds.append(medication)
        print(f"  ✓ Created: {med_data['name']} {med_data['strength']}")
    else:
        created_meds.append(existing)
        print(f"  ⊙ Already exists: {med_data['name']}")

db.commit()

# Refresh to get IDs
for med in created_meds:
    db.refresh(med)

print(f"\n✅ Total medications: {len(created_meds)}")

# ============================================
# 2. GENERATE DAILY DATA FOR LAST 30 DAYS
# ============================================
print(f"\n📊 Generating health data for {DAYS_TO_GENERATE} days...")

end_date = datetime.now()
start_date = end_date - timedelta(days=DAYS_TO_GENERATE)

# Health parameters with realistic trends
base_systolic = 135  # Slightly high BP
base_diastolic = 85
base_glucose = 110  # Slightly elevated
base_weight = 75.0

events_created = 0
adherence_created = 0
alerts_created = 0

for day_offset in range(DAYS_TO_GENERATE):
    current_date = start_date + timedelta(days=day_offset)
    
    # Add slight improvement trend over time (simulation of treatment working)
    trend_factor = day_offset / DAYS_TO_GENERATE
    systolic_trend = base_systolic - (10 * trend_factor)  # Improve by 10 points
    glucose_trend = base_glucose - (15 * trend_factor)   # Improve by 15 points
    
    # Morning readings (8:00 AM)
    morning_time = current_date.replace(hour=8, minute=0, second=0, microsecond=0)
    
    # Blood Pressure (morning)
    systolic = int(systolic_trend + random.randint(-8, 8))
    diastolic = int(base_diastolic + random.randint(-5, 5))
    
    bp_event = Event(
        user_id=user_uuid,
        timestamp=morning_time,
        type="blood_pressure",
        payload={"systolic": systolic, "diastolic": diastolic, "unit": "mmHg"},
        source="manual",
        language="en"
    )
    db.add(bp_event)
    events_created += 1
    
    # Check if BP is concerning
    if systolic >= 140 or diastolic >= 90:
        alert = Alert(
            user_id=user_uuid,
            timestamp=morning_time,
            level="warning" if systolic < 160 else "critical",
            score=0.7 if systolic < 160 else 0.9,
            reason_codes=["high_blood_pressure"],
            dismissed=random.choice([True, False])
        )
        db.add(alert)
        alerts_created += 1
    
    # Blood Glucose (morning)
    glucose = int(glucose_trend + random.randint(-10, 15))
    
    glucose_event = Event(
        user_id=user_uuid,
        timestamp=morning_time + timedelta(minutes=30),
        type="blood_glucose",
        payload={"value": glucose, "unit": "mg/dL", "context": "fasting"},
        source="manual",
        language="en"
    )
    db.add(glucose_event)
    events_created += 1
    
    # Check if glucose is concerning
    if glucose >= 126:
        alert = Alert(
            user_id=user_uuid,
            timestamp=morning_time + timedelta(minutes=30),
            level="warning" if glucose < 160 else "critical",
            score=0.6 if glucose < 160 else 0.85,
            reason_codes=["high_glucose"],
            dismissed=random.choice([True, False])
        )
        db.add(alert)
        alerts_created += 1
    
    # Evening readings (8:00 PM)
    evening_time = current_date.replace(hour=20, minute=0, second=0, microsecond=0)
    
    # Blood Pressure (evening)
    systolic_eve = int(systolic_trend + random.randint(-5, 10))
    diastolic_eve = int(base_diastolic + random.randint(-3, 7))
    
    bp_event_eve = Event(
        user_id=user_uuid,
        timestamp=evening_time,
        type="blood_pressure",
        payload={"systolic": systolic_eve, "diastolic": diastolic_eve, "unit": "mmHg"},
        source="manual",
        language="en"
    )
    db.add(bp_event_eve)
    events_created += 1
    
    # Weight (every 3 days)
    if day_offset % 3 == 0:
        weight = base_weight + random.uniform(-0.5, 0.5)
        weight_event = Event(
            user_id=user_uuid,
            timestamp=current_date.replace(hour=7, minute=30, second=0, microsecond=0),
            type="weight",
            payload={"value": round(weight, 1), "unit": "kg"},
            source="manual",
            language="en"
        )
        db.add(weight_event)
        events_created += 1
    
    # Symptoms (random, ~20% of days)
    if random.random() < 0.2:
        symptoms = random.choice([
            ["headache", "fatigue"],
            ["dizziness"],
            ["nausea"],
            ["fatigue", "weakness"],
            ["chest_discomfort"]
        ])
        symptom_event = Event(
            user_id=user_uuid,
            timestamp=current_date.replace(hour=random.randint(10, 18), minute=random.randint(0, 59)),
            type="symptom",
            payload={"symptoms": symptoms, "severity": random.choice(["mild", "moderate"])},
            source="manual",
            language="en"
        )
        db.add(symptom_event)
        events_created += 1
    
    # ============================================
    # MEDICATION ADHERENCE LOGS
    # ============================================
    for medication in created_meds:
        for time_str in medication.times:
            hour, minute = map(int, time_str.split(':'))
            scheduled_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # 85% adherence rate (realistic)
            was_taken = random.random() < 0.85
            
            if was_taken:
                # Taken within 30 minutes of scheduled time
                taken_offset = random.randint(-15, 30)
                taken_time = scheduled_time + timedelta(minutes=taken_offset)
                status = "taken"
            else:
                taken_time = None
                status = random.choice(["missed", "skipped"])
            
            adherence = AdherenceLog(
                user_id=user_uuid,
                med_id=medication.id,
                scheduled_time=scheduled_time,
                taken_time=taken_time,
                status=status
            )
            db.add(adherence)
            adherence_created += 1
    
    # ============================================
    # DAILY SUMMARY
    # ============================================
    # Calculate daily adherence
    total_doses = sum(len(med.times) for med in created_meds)
    taken_doses = int(total_doses * (0.85 + random.uniform(-0.1, 0.1)))
    adherence_pct = (taken_doses / total_doses * 100) if total_doses > 0 else 0
    
    daily_summary = DerivedDaily(
        user_id=user_uuid,
        date=current_date.date(),
        adherence_pct=round(adherence_pct, 1),
        avg_bp=f"{systolic}/{diastolic}",
        bp_range=f"{systolic-5}-{systolic+5}/{diastolic-3}-{diastolic+3}",
        avg_glucose=float(glucose),
        glucose_range=f"{glucose-10}-{glucose+10}",
        avg_weight=base_weight,
        symptoms_count=1 if random.random() < 0.2 else 0,
        alerts_count=1 if (systolic >= 140 or glucose >= 126) else 0,
        max_risk_level="warning" if (systolic >= 140 or glucose >= 126) else "normal"
    )
    db.add(daily_summary)
    
    # Commit every 5 days to avoid large transactions
    if day_offset % 5 == 0:
        db.commit()
        print(f"  ✓ Day {day_offset + 1}/{DAYS_TO_GENERATE} completed")

# Final commit
db.commit()

print(f"\n✅ Data generation complete!")
print(f"📊 Summary:")
print(f"   💊 Medications: {len(created_meds)}")
print(f"   📈 Health events: {events_created}")
print(f"   ✔️  Adherence logs: {adherence_created}")
print(f"   ⚠️  Alerts: {alerts_created}")
print(f"   📅 Daily summaries: {DAYS_TO_GENERATE}")

db.close()

print(f"\n🎉 Mock data successfully created for {user.name}!")
print(f"🔗 Login at your app to see the data!")
