"""
Database configuration and connection setup with Supabase
"""
import os
from supabase import create_client, Client
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# ============================================
# SUPABASE CLIENT (for API operations)
# ============================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env")
    print("   Falling back to local SQLite database")

supabase_client: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase!")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        supabase_client = None

# ============================================
# SQLAlchemy (for ORM - Database abstraction)
# ============================================
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chronic_health.db")

# For SQLite (development/local)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # For PostgreSQL (via Supabase or direct)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Dependency for database session
    Used in FastAPI route functions to get a database connection
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize database tables
    NOTE: Auto-creation is DISABLED
    Tables must be created manually in Supabase SQL Editor
    See SQL code in create_tables.sql
    """
    # Base.metadata.create_all(bind=engine)  # ← DISABLED (tables created manually)
    print("✅ Database initialized (using manually created tables in Supabase)")
