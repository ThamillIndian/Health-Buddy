-- ============================================
-- CHRONIC HEALTH BUDDY - TABLE CREATION SQL
-- ============================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Run all queries at once
-- ============================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create condition_profiles table
CREATE TABLE IF NOT EXISTS condition_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    condition VARCHAR(100) NOT NULL,
    thresholds JSONB,
    baseline JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create medications table
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    strength VARCHAR(100),
    category VARCHAR(100),
    frequency VARCHAR(100),
    times JSONB,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    payload JSONB,
    source VARCHAR(50),
    raw_text TEXT,
    language VARCHAR(10),
    confidence FLOAT
);

-- 5. Create adherence_log table
CREATE TABLE IF NOT EXISTS adherence_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    med_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP NOT NULL,
    taken_time TIMESTAMP,
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(50),
    score FLOAT,
    reason_codes JSONB,
    event_id UUID REFERENCES events(id),
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP
);

-- 7. Create derived_daily table
CREATE TABLE IF NOT EXISTS derived_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    adherence_pct FLOAT,
    avg_bp VARCHAR(50),
    bp_range VARCHAR(50),
    avg_glucose FLOAT,
    glucose_range VARCHAR(50),
    avg_weight FLOAT,
    symptoms_count INTEGER DEFAULT 0,
    alerts_count INTEGER DEFAULT 0,
    max_risk_level VARCHAR(50)
);

-- 8. Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    period_days INTEGER,
    file_path VARCHAR(255),
    pdf_url VARCHAR(255),
    generated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Verification Query (run this to verify)
-- ============================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
-- 
-- Should show 8 tables:
-- - adherence_log
-- - alerts
-- - condition_profiles
-- - derived_daily
-- - events
-- - medications
-- - reports
-- - users
