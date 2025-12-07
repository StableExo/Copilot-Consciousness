# Supabase Connection Configuration Guide

**Project:** ydvevgqxcfizualicbom  
**Generated:** 2025-12-04

---

## 🎯 TL;DR - What You Need

For **Copilot-Consciousness**, you need **TWO** types of connections:

### 1. JavaScript Client (Primary - Already Configured ✅)
```bash
SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your_anon_key_here
# OR the new format:
SUPABASE_PUBLISHABLE_KEY=sb_publishable_6IR3Q8vav9TOVXFH2wgRoA_ztzElWz3
```

### 2. Direct PostgreSQL Connection (For Migrations - Optional)
```bash
# Method: Direct Connection (port 5432)
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
```

---

## 📊 Connection Methods Explained

Supabase offers **3 connection modes** for PostgreSQL:

### 1. **Direct Connection** (Port 5432) ✅ RECOMMENDED for Migrations
- **Use when:** Running migrations, admin operations, one-time scripts
- **Connection string format:**
  ```
  postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
  ```
- **Pros:** Direct database access, full permissions, supports DDL (CREATE TABLE)
- **Cons:** Limited connections (max 60-90), slower for high-traffic apps
- **Perfect for:** Our migration scripts!

### 2. **Transaction Pooler** (Port 6543)
- **Use when:** High-traffic applications with many short transactions
- **Connection string format:**
  ```
  postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
  ```
- **Pros:** Handles 10,000+ connections efficiently
- **Cons:** Doesn't support prepared statements or LISTEN/NOTIFY
- **Not needed for:** Our AI agent use case

### 3. **Session Pooler** (Port 5432 with pooler subdomain)
- **Use when:** Need connection pooling with prepared statement support
- **Connection string format:**
  ```
  postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
  ```
- **Pros:** Balance between pooling and compatibility
- **Cons:** More complex setup
- **Not needed for:** Our use case

---

## 🎯 What Copilot-Consciousness Needs

### For 90% of Operations: JavaScript Client (Already Working! ✅)

**What we use it for:**
- Querying consciousness states
- Storing memories
- Reading agent configuration
- Real-time subscriptions

**Current configuration (PERFECT - don't change):**
```bash
SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_PUBLISHABLE_KEY=sb_publishable_6IR3Q8vav9TOVXFH2wgRoA_ztzElWz3
```

**Used by:**
- `src/infrastructure/supabase/client.ts`
- `scripts/store-env-in-supabase.ts`
- `scripts/migrate-to-supabase.ts`
- All future AI agent operations

### For Migrations: Direct PostgreSQL Connection (Optional)

**What it's for:**
- Running SQL migrations (CREATE TABLE, etc.)
- Alternative to Supabase dashboard SQL editor

**Configuration:**
```bash
# Add this ONLY if you want to run migrations via CLI instead of dashboard
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
```

**To get YOUR password:**
1. Go to: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/settings/database
2. Look for "Database password" (you set this when creating the project)
3. Or click "Reset database password" to generate a new one

**Used by:**
- `scripts/apply-supabase-migrations.ts` (only if you want CLI migrations)

---

## 🔑 How to Get the Correct Values from Supabase Dashboard

### Step 1: Get Your Connection String

1. Go to: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/settings/database
2. Scroll to **"Connection string"** section
3. You'll see dropdowns:

#### **Connection type:** Choose "URI"
This gives you the connection string format.

#### **Connection method:** Choose "Direct connection"
```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
```

### Step 2: Replace `[YOUR-PASSWORD]`

The connection string shows `[YOUR-PASSWORD]` as a placeholder. Replace it with:
- Your actual database password (set when creating project)
- OR reset it: Settings > Database > "Reset database password"

### Step 3: Add to .env (If you want CLI migrations)

```bash
# Add this line to your .env file:
DATABASE_URL=postgresql://postgres.[project-ref]:YOUR_ACTUAL_PASSWORD_HERE@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
```

---

## ⚠️ IMPORTANT: What NOT to Use

### ❌ Don't use Transaction Pooler (port 6543) for migrations
```bash
# DON'T USE THIS for migrations:
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```
**Why?** Transaction pooler doesn't support DDL operations (CREATE TABLE won't work).

### ❌ Don't change the JavaScript client config
Your current setup with `SUPABASE_URL` and `SUPABASE_ANON_KEY` is already correct!

---

## 🎯 Recommended Setup for Copilot-Consciousness

### Option A: Dashboard-Based (Easiest - No Additional Config Needed)
**Your current .env is PERFECT for this!**

```bash
# What you already have (sufficient):
SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_PUBLISHABLE_KEY=sb_publishable_6IR3Q8...
```

**Migration method:**
1. Open dashboard SQL editor
2. Paste SQL files
3. Done!

### Option B: CLI-Based (Advanced - Requires Password)
**Add ONE additional variable:**

```bash
# Everything from Option A, PLUS:
DATABASE_URL=postgresql://postgres.[project-ref]:YOUR_ACTUAL_PASSWORD@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
```

**Migration method:**
1. Run: `npx tsx scripts/apply-supabase-migrations.ts`
2. Done!

---

## 📋 Complete Environment Variable Checklist

### ✅ Already Have (Sufficient for 90% of operations)
- [x] `SUPABASE_URL` - Your project URL
- [x] `SUPABASE_ANON_KEY` - For authenticated client operations
- [x] `SUPABASE_PUBLISHABLE_KEY` - New format (alternative to anon key)
- [x] `USE_SUPABASE=true` - Enable Supabase features

### 🔧 Optional (Only if you want CLI migrations)
- [ ] `DATABASE_URL` - Direct PostgreSQL connection string
- [ ] `SUPABASE_SERVICE_KEY` - Admin operations (bypass RLS)

### ❌ NOT Needed for Copilot-Consciousness
- [ ] Transaction pooler connection (port 6543)
- [ ] Session pooler connection
- [ ] Read replica connections
- [ ] IPv6 connection strings

---

## 🚀 Quick Decision Tree

```
Do you want to run migrations via CLI?
│
├─ NO → Use current .env as-is (✅ RECOMMENDED)
│        Migrations via dashboard SQL editor
│
└─ YES → Add DATABASE_URL with Direct Connection (port 5432)
         Get password from: Settings > Database
         Format: postgresql://postgres.[project-ref]:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres
```

---

## 🔍 Troubleshooting Connection Strings

### If you see different options in Supabase dashboard:

**Language:** Doesn't matter - all generate the same PostgreSQL connection
- URI → Universal format (use this)
- PSQL → Command for psql CLI
- GoLang → Go code snippet
- .NET → C# code snippet

**Connection Method:**
- **Direct connection** ✅ → Port 5432, `db.ydvevgqxcfizualicbom.supabase.co`
- Transaction pooler → Port 6543, `pooler.supabase.com`
- Session pooler → Port 5432, `pooler.supabase.com`

**For our use case:** Always choose **"Direct connection"** if setting up `DATABASE_URL`.

---

## 💡 Summary

**For Copilot-Consciousness migration:**

1. **Your current .env is PERFECT** ✅
   - Already has: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`
   - This is sufficient for all AI agent operations

2. **For migrations, you have 2 options:**
   - **Option A (Easiest):** Use dashboard SQL editor - no additional config needed
   - **Option B (Advanced):** Add `DATABASE_URL` with Direct Connection (port 5432)

3. **Choose "Direct connection" (port 5432)** if adding `DATABASE_URL`
   - Format: `postgresql://postgres.[project-ref]:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres`
   - Get password from: Settings > Database

4. **Don't use transaction pooler (port 6543)** for migrations
   - It doesn't support CREATE TABLE

**Recommendation:** Stick with your current config + dashboard SQL editor. It's the simplest and what our scripts are designed for! 🎯

---

**Questions?** Check:
- Supabase docs: https://supabase.com/docs/guides/database/connecting-to-postgres
- Our walkthrough: `SUPABASE_MIGRATION_WALKTHROUGH.md`
