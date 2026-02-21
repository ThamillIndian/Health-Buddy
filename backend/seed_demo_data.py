"""
Seed demo data for testing all 3 scenarios
Run this with: python -m backend.seed_demo_data
"""
import sys
sys.path.insert(0, '.')

from backend.app.database import SessionLocal
from backend.app.models import User, Event, Medication, AdherenceLog, ConditionProfile
from datetime import datetime, timedelta
import uuid
import json

def seed_demo_scenarios():
    """Seed 3 complete demo scenarios"""
    db = SessionLocal()
    
    print("🎬 Starting Demo Scenario Seed...\n")
    
    # ============== SCENARIO 1: BP ESCALATION ==============
    print("📊 Scenario 1: BP Escalation (Green → Amber → Red)")
    user1 = User(
        id=str(uuid.uuid4()),
        name="Ramesh Kumar (BP Test)",
        email="scenario1@demo.com",
        phone="9876543210",
        language="en",
        timezone="UTC"
    )
    db.add(user1)
    
    cond1 = ConditionProfile(
        id=str(uuid.uuid4()),
        user_id=user1.id,
        condition="hypertension",
        thresholds={"bp_high": 140, "bp_low": 90},
        baseline={}
    )
    db.add(cond1)
    
    # Day 1: 140/90 - Green
    for hour in [8, 14, 20]:
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user1.id,
            type="vital",
            payload={"bp": "140/90", "glucose": 110},
            timestamp=datetime.utcnow() - timedelta(days=2, hours=24-hour),
            source="web",
            language="en"
        )
        db.add(event)
    
    # Day 2: 145/92 - Amber (rising)
    for hour in [8, 14]:
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user1.id,
            type="vital",
            payload={"bp": "145/92", "glucose": 115},
            timestamp=datetime.utcnow() - timedelta(days=1, hours=24-hour),
            source="web",
            language="en"
        )
        db.add(event)
    
    # Day 3: 155/98 - Red (critical)
    event = Event(
        id=str(uuid.uuid4()),
        user_id=user1.id,
        type="vital",
        payload={"bp": "155/98", "glucose": 120},
        timestamp=datetime.utcnow(),
        source="web",
        language="en"
    )
    db.add(event)
    
    # Add medications
    med1 = Medication(
        id=str(uuid.uuid4()),
        user_id=user1.id,
        name="Lisinopril",
        strength="10mg",
        category="hypertension",
        frequency="once_daily",
        times=["08:00"],
        active=True
    )
    db.add(med1)
    
    # Add adherence logs
    for day in range(3):
        adherence = AdherenceLog(
            id=str(uuid.uuid4()),
            user_id=user1.id,
            med_id=med1.id,
            scheduled_time=datetime.utcnow() - timedelta(days=2-day, hours=16),
            taken_time=datetime.utcnow() - timedelta(days=2-day, hours=15),
            status="taken"
        )
        db.add(adherence)
    
    db.commit()
    print(f"✅ Scenario 1 created: {user1.id}")
    print(f"   Name: {user1.name} | Email: {user1.email}\n")
    
    # ============== SCENARIO 2: MISSED MEDS ==============
    print("💊 Scenario 2: Missed Medications Impact (Good → Bad)")
    user2 = User(
        id=str(uuid.uuid4()),
        name="Priya Sharma (Medication Test)",
        email="scenario2@demo.com",
        phone="9876543211",
        language="en",
        timezone="UTC"
    )
    db.add(user2)
    
    cond2 = ConditionProfile(
        id=str(uuid.uuid4()),
        user_id=user2.id,
        condition="diabetes",
        thresholds={"glucose_high": 180, "glucose_low": 70},
        baseline={}
    )
    db.add(cond2)
    
    # Add medication
    med2 = Medication(
        id=str(uuid.uuid4()),
        user_id=user2.id,
        name="Metformin",
        strength="500mg",
        category="diabetes",
        frequency="twice_daily",
        times=["08:00", "20:00"],
        active=True
    )
    db.add(med2)
    
    # Days 1-2: Good adherence, normal glucose
    for day in [6, 5]:
        # Morning
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            type="medication",
            payload={"medication": "Metformin", "taken": True},
            timestamp=datetime.utcnow() - timedelta(days=day, hours=16),
            source="web"
        )
        db.add(event)
        
        # Glucose
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            type="vital",
            payload={"glucose": 110},
            timestamp=datetime.utcnow() - timedelta(days=day, hours=15),
            source="web"
        )
        db.add(event)
        
        # Add adherence log
        adherence = AdherenceLog(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            med_id=med2.id,
            scheduled_time=datetime.utcnow() - timedelta(days=day, hours=16),
            taken_time=datetime.utcnow() - timedelta(days=day, hours=15),
            status="taken"
        )
        db.add(adherence)
    
    # Days 3-5: Missed meds, glucose rising
    for day, glucose in [(4, 145), (3, 160), (2, 175)]:
        # Missed medication
        adherence = AdherenceLog(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            med_id=med2.id,
            scheduled_time=datetime.utcnow() - timedelta(days=day, hours=16),
            status="missed"
        )
        db.add(adherence)
        
        # Rising glucose
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            type="vital",
            payload={"glucose": glucose},
            timestamp=datetime.utcnow() - timedelta(days=day, hours=15),
            source="web"
        )
        db.add(event)
    
    # Day 6-7: Resumed meds, glucose coming down
    for day, glucose in [(1, 150), (0, 120)]:
        # Resumed medication
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            type="medication",
            payload={"medication": "Metformin", "taken": True},
            timestamp=datetime.utcnow() - timedelta(days=day, hours=16),
            source="web"
        )
        db.add(event)
        
        # Improving glucose
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            type="vital",
            payload={"glucose": glucose},
            timestamp=datetime.utcnow() - timedelta(days=day, hours=15),
            source="web"
        )
        db.add(event)
        
        # Adherence log
        adherence = AdherenceLog(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            med_id=med2.id,
            scheduled_time=datetime.utcnow() - timedelta(days=day, hours=16),
            taken_time=datetime.utcnow() - timedelta(days=day, hours=15),
            status="taken"
        )
        db.add(adherence)
    
    db.commit()
    print(f"✅ Scenario 2 created: {user2.id}")
    print(f"   Name: {user2.name} | Email: {user2.email}\n")
    
    # ============== SCENARIO 3: PERFECT ADHERENCE ==============
    print("🌟 Scenario 3: Perfect Health & Adherence")
    user3 = User(
        id=str(uuid.uuid4()),
        name="Arjun Patel (Perfect Health)",
        email="scenario3@demo.com",
        phone="9876543212",
        language="en",
        timezone="UTC"
    )
    db.add(user3)
    
    cond3 = ConditionProfile(
        id=str(uuid.uuid4()),
        user_id=user3.id,
        condition="hypertension",
        thresholds={"bp_high": 140, "bp_low": 90},
        baseline={"bp_normal": "120/80"}
    )
    db.add(cond3)
    
    # Add medication
    med3 = Medication(
        id=str(uuid.uuid4()),
        user_id=user3.id,
        name="Amlodipine",
        strength="5mg",
        category="hypertension",
        frequency="once_daily",
        times=["08:00"],
        active=True
    )
    db.add(med3)
    
    # 7 days of perfect adherence and stable vitals
    for day in range(7):
        # Medication taken
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user3.id,
            type="medication",
            payload={"medication": "Amlodipine", "taken": True},
            timestamp=datetime.utcnow() - timedelta(days=6-day, hours=16),
            source="web"
        )
        db.add(event)
        
        # Perfect BP
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user3.id,
            type="vital",
            payload={"bp": "120/80", "glucose": 105, "weight": 70},
            timestamp=datetime.utcnow() - timedelta(days=6-day, hours=15),
            source="web"
        )
        db.add(event)
        
        # Adherence log
        adherence = AdherenceLog(
            id=str(uuid.uuid4()),
            user_id=user3.id,
            med_id=med3.id,
            scheduled_time=datetime.utcnow() - timedelta(days=6-day, hours=16),
            taken_time=datetime.utcnow() - timedelta(days=6-day, hours=15),
            status="taken"
        )
        db.add(adherence)
    
    db.commit()
    print(f"✅ Scenario 3 created: {user3.id}")
    print(f"   Name: {user3.name} | Email: {user3.email}\n")
    
    # ============== SUMMARY ==============
    print("=" * 60)
    print("✅ ALL 3 DEMO SCENARIOS CREATED SUCCESSFULLY!\n")
    print("📋 TEST CREDENTIALS:\n")
    print(f"Scenario 1 (BP Escalation):")
    print(f"  Email: scenario1@demo.com\n")
    print(f"Scenario 2 (Medication Impact):")
    print(f"  Email: scenario2@demo.com\n")
    print(f"Scenario 3 (Perfect Health):")
    print(f"  Email: scenario3@demo.com\n")
    print("=" * 60)
    print("\n🎬 Ready for demo! Use the emails above to log in.\n")
    
    db.close()

if __name__ == "__main__":
    seed_demo_scenarios()
