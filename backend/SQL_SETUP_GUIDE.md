# How to Create Tables in Supabase

## Step 1: Open Supabase SQL Editor

1. Go to https://app.supabase.com
2. Click your project: "Chronic Health Buddy"
3. Left sidebar → **SQL Editor**
4. Click **New Query** (or the "+" button)

---

## Step 2: Copy the SQL Code

The SQL code is in: `backend/create_tables.sql`

**Copy the ENTIRE content** (all 8 CREATE TABLE statements)

---

## Step 3: Paste into Supabase

1. In the SQL Editor text area, paste the entire SQL
2. Click **Run** (or press Ctrl+Enter)

**You should see:**
```
✅ 8 queries executed successfully
```

---

## Step 4: Verify Tables Created

Still in SQL Editor, run this verification query:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Should show 8 rows:**
```
adherence_log
alerts
condition_profiles
derived_daily
events
medications
reports
users
```

---

## Step 5: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

**Should see:**
```
✅ Connected to Supabase!
Starting up - initializing database...
✅ Database initialized (using manually created tables in Supabase)
INFO: Uvicorn running on http://0.0.0.0:8000
```

✅ **YOU'RE DONE!** Tables are ready! 🚀

---

## Note

- The `init_db()` function is now disabled (auto-creation OFF)
- Your app will use the manually created tables
- Everything works as normal!
