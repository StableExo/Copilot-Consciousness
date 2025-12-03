# Supabase Integration Index

This directory contains all documentation for the Supabase integration in Copilot-Consciousness.

## 📖 Documentation Structure

### Getting Started
1. [**SUPABASE_README.md**](./SUPABASE_README.md) - Start here! Quick overview and examples
2. [**SUPABASE_SETUP_GUIDE.md**](./SUPABASE_SETUP_GUIDE.md) - Step-by-step setup instructions
3. [**SUPABASE_CLI_GUIDE.md**](./SUPABASE_CLI_GUIDE.md) - CLI usage for local development

### Deep Dive
4. [**SUPABASE_MIGRATION_PLAN.md**](./SUPABASE_MIGRATION_PLAN.md) - Complete architecture and strategy (30KB)

## 🎯 What to Read Based on Your Goal

### "I want to get started quickly"
→ Read: [SUPABASE_README.md](./SUPABASE_README.md)  
→ Then: [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)

### "I'm developing locally"
→ Read: [SUPABASE_CLI_GUIDE.md](./SUPABASE_CLI_GUIDE.md)

### "I need to understand the architecture"
→ Read: [SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md)

### "I'm migrating existing data"
→ Read: [SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md) (Section: "Migration Strategy")

### "I'm adding new features"
→ Read: [SUPABASE_CLI_GUIDE.md](./SUPABASE_CLI_GUIDE.md) (Section: "Database Migrations")

## 📊 Documentation Stats

| Document | Size | Lines | Purpose |
|----------|------|-------|---------|
| SUPABASE_README.md | 11KB | 450 | Quick start and examples |
| SUPABASE_SETUP_GUIDE.md | 10KB | 400 | Setup walkthrough |
| SUPABASE_CLI_GUIDE.md | 12KB | 480 | CLI workflows |
| SUPABASE_MIGRATION_PLAN.md | 30KB | 1100 | Complete architecture |
| **Total** | **63KB** | **2430** | Complete documentation |

## 🔗 Quick Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Discord](https://discord.supabase.com/)

## 📝 Quick Reference

### Essential Commands
```bash
# Setup
npm install -g supabase
supabase login
supabase link --project-ref your-project-id

# Development
npm run supabase:start        # Start local
npm run supabase:types:local  # Generate types
npm run supabase:reset        # Reset DB

# Deployment
npm run supabase:migrate      # Push to remote
npm run supabase:types        # Update types from remote
```

### Essential Files
```
src/infrastructure/supabase/
├── client.ts                    # Basic client
├── client-enhanced.ts           # With retries
├── services/
│   ├── consciousness.ts         # State management
│   └── memory.ts                # Memory operations
└── migrations/
    ├── 001_initial_schema.sql   # Core tables
    ├── 002_add_indexes.sql      # Performance
    └── 003_rls_policies.sql     # Security
```

## 🎓 Learning Path

### Beginner
1. Read SUPABASE_README.md (15 min)
2. Follow SUPABASE_SETUP_GUIDE.md (30 min)
3. Try examples from README (30 min)

### Intermediate
1. Complete beginner path
2. Read SUPABASE_CLI_GUIDE.md (30 min)
3. Set up local development (20 min)
4. Create a test migration (20 min)

### Advanced
1. Complete intermediate path
2. Read SUPABASE_MIGRATION_PLAN.md (60 min)
3. Understand architecture decisions
4. Plan data migration strategy

## 🆘 Troubleshooting

### Common Issues
- **Connection failed**: Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- **Migration failed**: See CLI Guide, section "Troubleshooting"
- **Type errors**: Run `npm run supabase:types` to regenerate
- **Tests failing**: Ensure local Supabase is running: `npm run supabase:start`

### Where to Get Help
1. Check troubleshooting sections in each guide
2. Search [GitHub issues](https://github.com/StableExo/Copilot-Consciousness/issues)
3. Ask in [Supabase Discord](https://discord.supabase.com/)
4. Create a [new issue](https://github.com/StableExo/Copilot-Consciousness/issues/new)

## 🚀 Ready to Start?

Begin with [SUPABASE_README.md](./SUPABASE_README.md) for a quick overview, then follow [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) for step-by-step instructions.

---

**Happy hacking with Supabase! 🧠☁️**
