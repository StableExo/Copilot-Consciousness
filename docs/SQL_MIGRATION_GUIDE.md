# SQL Migration Guide - TheWarden Database

## 📋 Overview

This document tracks the SQL migrations for TheWarden's Supabase database and provides guidance on which migrations to run next.

## 🗂️ Migration Files Location

All migration files are located in:
```
src/infrastructure/supabase/migrations/
```

## 📊 Migration Status Tracking

### ✅ Completed Migrations

Track your applied migrations here by marking them complete:

| Migration | File | Description | Status | Date Applied | Notes |
|-----------|------|-------------|--------|--------------|-------|
| 001 | `001_initial_schema.sql` | Initial database schema (tables, indexes, constraints) | ⏸️ Pending | - | Core schema setup |
| 002 | `002_add_indexes.sql` | Performance indexes for queries | ⏸️ Pending | - | Query optimization |
| 002B | `002B_add_missing_indexes.sql` | Additional missing indexes | ⏸️ Pending | - | Extended optimization |
| 003 | `003_rls_policies.sql` | Row Level Security policies | ⏸️ Pending | - | Security & access control |
| 004 | `004_add_vector_search.sql` | Vector search functionality (pgvector) | ⏸️ Pending | - | AI/ML search capabilities |
| 005 | `005_documentation_storage.sql` | Documentation storage tables | ⏸️ Pending | - | Knowledge base storage |
| 006 | `006_environment_storage.sql` | Environment config & secrets | ⏸️ Pending | - | Configuration management |

## 🎯 Next Migration to Run

### **Current Recommendation: Start with 001_initial_schema.sql**

If you're setting up the database for the first time, run migrations in order:

```bash
# 1. Initial Schema (REQUIRED - Run this first)
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/001_initial_schema.sql

# 2. Add Indexes (Performance optimization)
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/002_add_indexes.sql

# 3. Additional Indexes (Extended performance)
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/002B_add_missing_indexes.sql

# 4. RLS Policies (Security - IMPORTANT)
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/003_rls_policies.sql

# 5. Vector Search (AI/ML features)
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/004_add_vector_search.sql

# 6. Documentation Storage
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/005_documentation_storage.sql

# 7. Environment Storage
psql -h <your-db-host> -U <username> -d <database> -f src/infrastructure/supabase/migrations/006_environment_storage.sql
```

### Using Supabase CLI (Recommended)

If you're using Supabase:

```bash
# Initialize Supabase in project (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push

# Or apply migrations individually
supabase db execute --file src/infrastructure/supabase/migrations/001_initial_schema.sql
```

## 🔍 Migration Dependencies

### Critical Path (Must run in order)
1. **001_initial_schema.sql** ← START HERE (creates base tables)
2. **003_rls_policies.sql** (depends on tables from 001)
3. **002_add_indexes.sql** & **002B_add_missing_indexes.sql** (depends on tables from 001)

### Optional Features (Can be added later)
- **004_add_vector_search.sql** - Only if using AI/ML vector search features
- **005_documentation_storage.sql** - Only if storing documentation in database
- **006_environment_storage.sql** - Only if managing environment config in database

## 📝 Migration Contents Summary

### 001_initial_schema.sql (REQUIRED)
- Creates core tables: `opportunities`, `executions`, `performance_metrics`, `backtest_results`
- Sets up initial indexes and constraints
- **Size**: ~11.4 KB
- **Run Time**: ~500ms

### 002_add_indexes.sql
- Adds performance indexes for frequently queried fields
- Optimizes queries on timestamps, status fields, profit calculations
- **Size**: ~6.4 KB
- **Run Time**: ~200ms

### 002B_add_missing_indexes.sql
- Additional indexes that were identified as missing
- Extended optimization for complex queries
- **Size**: ~11.0 KB
- **Run Time**: ~300ms

### 003_rls_policies.sql (SECURITY)
- Implements Row Level Security policies
- Controls data access based on user authentication
- **IMPORTANT**: Required for multi-tenant security
- **Size**: ~11.7 KB
- **Run Time**: ~400ms

### 004_add_vector_search.sql (OPTIONAL)
- Enables pgvector extension for vector similarity search
- Creates vector columns and indexes
- **Requires**: PostgreSQL with pgvector extension
- **Size**: ~4.6 KB
- **Run Time**: ~300ms

### 005_documentation_storage.sql (OPTIONAL)
- Creates tables for storing documentation and knowledge base
- Includes versioning and metadata tracking
- **Size**: ~11.0 KB
- **Run Time**: ~400ms

### 006_environment_storage.sql (OPTIONAL)
- Tables for storing environment configuration and encrypted secrets
- Includes validation and audit trails
- **Size**: ~5.5 KB
- **Run Time**: ~300ms

## 🔒 Security Considerations

### Before Running Migrations

1. **Backup your database**:
   ```bash
   supabase db dump -f backup-$(date +%Y%m%d).sql
   ```

2. **Test in development first**:
   - Never run migrations directly on production without testing
   - Use a staging environment

3. **Review SQL files**:
   - Read each migration file before applying
   - Understand what tables/policies are being created

### After Running Migrations

1. **Verify schema**:
   ```bash
   supabase db diff
   ```

2. **Check RLS policies** (after migration 003):
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

3. **Test data access**:
   - Verify that authenticated users can access their data
   - Verify that unauthenticated access is blocked (if using RLS)

## 🛠️ Troubleshooting

### Migration Already Applied

If you see errors like "table already exists" or "policy already exists":

```sql
-- Check existing tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check existing policies
SELECT policyname FROM pg_policies WHERE schemaname = 'public';
```

**Solution**: Migrations are idempotent. They include `IF NOT EXISTS` or `DROP ... IF EXISTS` clauses.

### Extension Not Available

If `004_add_vector_search.sql` fails with "extension pgvector not available":

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

**Note**: Supabase projects have pgvector pre-installed. If using custom PostgreSQL, install pgvector first.

### Permission Denied

If you see "permission denied" errors:

```bash
# Ensure you're using the correct database user
# For Supabase, use the postgres user
supabase db execute --file <migration-file>
```

## 📈 Migration Tracking Template

Copy this to track your progress:

```
Date: _______________
Environment: [ ] Development [ ] Staging [ ] Production

Migrations Applied:
[ ] 001_initial_schema.sql
[ ] 002_add_indexes.sql
[ ] 002B_add_missing_indexes.sql
[ ] 003_rls_policies.sql
[ ] 004_add_vector_search.sql
[ ] 005_documentation_storage.sql
[ ] 006_environment_storage.sql

Notes:
_____________________________________________
_____________________________________________
_____________________________________________

Applied by: _______________
Verified by: _______________
```

## 🔄 Rollback Procedures

If you need to rollback a migration:

### General Rollback Pattern

```sql
-- Drop tables created in migration
DROP TABLE IF EXISTS <table_name> CASCADE;

-- Drop policies created in migration
DROP POLICY IF EXISTS <policy_name> ON <table_name>;

-- Drop indexes created in migration
DROP INDEX IF EXISTS <index_name>;
```

### Specific Rollback Scripts

Create rollback scripts for each migration in `migrations/rollback/`:

```bash
migrations/
├── 001_initial_schema.sql
├── rollback/
│   └── 001_rollback.sql
```

## 📚 Additional Resources

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## 💡 Best Practices

1. **Always run migrations in order** (001 → 006)
2. **Test in development environment first**
3. **Backup before applying to production**
4. **Review migration file contents before running**
5. **Document when migrations are applied** (update the tracking table above)
6. **Use version control** for migration files
7. **Create rollback scripts** for each migration
8. **Monitor database performance** after applying indexes

## 🎯 Quick Decision Guide

**"Which migration should I run next?"**

1. **First time setup?** → Run 001, then 002/002B, then 003
2. **Need security?** → Run 003_rls_policies.sql (IMPORTANT)
3. **Slow queries?** → Run 002_add_indexes.sql & 002B_add_missing_indexes.sql
4. **Need AI search?** → Run 004_add_vector_search.sql
5. **Storing docs?** → Run 005_documentation_storage.sql
6. **Managing config?** → Run 006_environment_storage.sql

---

**Last Updated**: 2025-12-10  
**Maintained By**: TheWarden Development Team  
**Version**: 1.0.0
