# Supabase CLI Integration Guide

This guide covers using the Supabase CLI for local development, migrations, type generation, and project management with Copilot-Consciousness.

## Installation

### Install Supabase CLI

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# npm (cross-platform)
npm install -g supabase

# Verify installation
supabase --version
```

## Quick Start

### 1. Initialize Supabase Locally

```bash
# Navigate to project root
cd /path/to/Copilot-Consciousness

# Initialize Supabase (creates supabase/ directory)
supabase init

# Start local Supabase stack (Docker required)
supabase start
```

This starts:
- PostgreSQL database on `localhost:54322`
- Supabase Studio on `http://localhost:54323`
- API Gateway on `http://localhost:54321`
- Auth service
- Storage service
- Realtime service

### 2. Link to Remote Project

```bash
# Login to Supabase
supabase login

# Link to your cloud project
supabase link --project-ref your-project-id

# You can find project-id in your Supabase dashboard URL:
# https://supabase.com/dashboard/project/[project-id]
```

## Database Migrations

### Creating Migrations

Our migrations are already in `src/infrastructure/supabase/migrations/`. To use them:

```bash
# Copy our migrations to Supabase directory
cp src/infrastructure/supabase/migrations/*.sql supabase/migrations/

# Or create a new migration
supabase migration new add_new_feature

# Edit the generated file
nano supabase/migrations/[timestamp]_add_new_feature.sql
```

### Applying Migrations

```bash
# Apply to local database
supabase db reset  # Resets DB and applies all migrations

# Or apply incrementally
supabase migration up

# Apply to remote (linked) project
supabase db push
```

### Migration Workflow Example

```bash
# 1. Create new migration
supabase migration new add_performance_metrics

# 2. Edit the file (opens in editor)
# supabase/migrations/20250103120000_add_performance_metrics.sql
cat > supabase/migrations/$(ls -t supabase/migrations | head -1) << 'EOF'
-- Add performance metrics table
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_name ON performance_metrics(metric_name);
EOF

# 3. Test locally
supabase db reset
npm run test:supabase

# 4. Push to remote when ready
supabase db push
```

### Diffing Schema Changes

If you made changes in the Supabase Studio UI:

```bash
# Generate migration from remote schema changes
supabase db diff --use-migra > supabase/migrations/$(date +%Y%m%d%H%M%S)_studio_changes.sql

# Review the generated migration
cat supabase/migrations/*_studio_changes.sql

# Apply if looks good
supabase db reset
```

## Type Generation

### Generate TypeScript Types

```bash
# Generate from local database
supabase gen types typescript --local > src/infrastructure/supabase/schemas/database.types.ts

# Generate from remote (linked) project
supabase gen types typescript --linked > src/infrastructure/supabase/schemas/database.types.ts

# Or use project ID directly
supabase gen types typescript --project-id your-project-id > src/infrastructure/supabase/schemas/database.types.ts
```

### Automated Type Generation

Add to `package.json`:

```json
{
  "scripts": {
    "supabase:types": "supabase gen types typescript --linked > src/infrastructure/supabase/schemas/database.types.ts",
    "supabase:types:local": "supabase gen types typescript --local > src/infrastructure/supabase/schemas/database.types.ts"
  }
}
```

Then use:

```bash
npm run supabase:types        # From remote
npm run supabase:types:local  # From local
```

### Watch for Type Changes (Development)

```bash
# Terminal 1: Watch for schema changes
supabase db reset --watch

# Terminal 2: Auto-regenerate types when schema changes
while true; do
  supabase gen types typescript --local > src/infrastructure/supabase/schemas/database.types.ts
  sleep 5
done
```

## Project Management

### List Projects

```bash
# List all your projects
supabase projects list

# Filter by organization
supabase projects list --org-id your-org-id
```

### Create New Project

```bash
# Interactive creation
supabase projects create my-new-project

# With flags
supabase projects create my-project \
  --org-id your-org-id \
  --db-password your-secure-password \
  --region us-east-1
```

### Project Status

```bash
# Check project status
supabase status

# Check database connection
supabase db ping
```

### Secrets Management

```bash
# List secrets
supabase secrets list

# Set secret
supabase secrets set OPENAI_API_KEY=sk-...

# Unset secret
supabase secrets unset OPENAI_API_KEY
```

## Local Development Workflow

### Daily Development Flow

```bash
# Morning: Start local Supabase
supabase start

# Work on features, making schema changes as needed
# Changes are applied immediately to local DB

# Generate types after schema changes
npm run supabase:types:local

# Test locally
npm run test:supabase

# Evening: Stop local Supabase
supabase stop

# Before committing: Create migration from changes
supabase db diff --use-migra > supabase/migrations/$(date +%Y%m%d%H%M%S)_daily_changes.sql

# Commit migration file
git add supabase/migrations/
git commit -m "Add daily schema changes"
```

### Team Collaboration

```bash
# Pull latest code with new migrations
git pull

# Apply new migrations locally
supabase db reset

# Regenerate types
npm run supabase:types:local

# Continue development
```

## Database Management

### Seeding Data

Create seed file:

```bash
# supabase/seed.sql
INSERT INTO semantic_memories (memory_id, content, category, importance)
VALUES 
  ('seed-001', 'Development seed data', 'test', 1),
  ('seed-002', 'Another test memory', 'test', 1);
```

Apply seed:

```bash
# Seeds run automatically with db reset
supabase db reset

# Or manually
supabase db seed
```

### Database Backup

```bash
# Dump local database
supabase db dump -f backup-local-$(date +%Y%m%d).sql

# Dump remote database
supabase db dump --linked -f backup-remote-$(date +%Y%m%d).sql

# Restore from backup
supabase db restore backup-local-20250103.sql
```

### Database Console

```bash
# Open psql console to local database
supabase db psql

# Execute SQL directly
supabase db execute "SELECT COUNT(*) FROM consciousness_states;"

# Execute SQL file
supabase db execute -f scripts/analytics.sql
```

## Functions and Edge Functions

### Create Edge Function

```bash
# Create new function
supabase functions new process-consciousness

# Serve locally for testing
supabase functions serve process-consciousness

# Deploy to remote
supabase functions deploy process-consciousness
```

## Testing

### Test Suite Integration

Add Supabase tests to `package.json`:

```json
{
  "scripts": {
    "test:supabase:setup": "supabase start && supabase db reset",
    "test:supabase": "npm run test:supabase:setup && vitest run tests/supabase",
    "test:supabase:watch": "supabase start && vitest watch tests/supabase"
  }
}
```

### Integration Test Example

```typescript
// tests/supabase/consciousness.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Consciousness Integration', () => {
  let supabase;

  beforeAll(() => {
    // Use local Supabase URL
    supabase = createClient(
      'http://localhost:54321',
      'your-anon-key-from-supabase-start-output'
    );
  });

  it('should save and retrieve consciousness state', async () => {
    const state = {
      session_id: 'test-session-001',
      version: '1.0.0',
      cognitive_load: 0.5,
      thoughts: [],
    };

    const { data, error } = await supabase
      .from('consciousness_states')
      .insert(state)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.session_id).toBe('test-session-001');
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/supabase-ci.yml
name: Supabase CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22.12.0'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Start Supabase
        run: supabase start
      
      - name: Verify migrations
        run: supabase db reset
      
      - name: Generate types
        run: npm run supabase:types:local
      
      - name: Run tests
        run: npm run test:supabase
      
      - name: Stop Supabase
        run: supabase stop
```

## Useful Commands Reference

### Status and Info

```bash
supabase status          # Show running services
supabase --version       # CLI version
supabase projects list   # List projects
supabase link --help     # Command help
```

### Database

```bash
supabase db start       # Start database
supabase db stop        # Stop database
supabase db reset       # Reset and migrate
supabase db push        # Push to remote
supabase db pull        # Pull from remote
supabase db diff        # Show diff
supabase db psql        # Open psql console
supabase db dump        # Backup database
```

### Migrations

```bash
supabase migration new <name>    # Create migration
supabase migration up             # Apply migrations
supabase migration list           # List migrations
supabase migration repair         # Fix migration state
```

### Types

```bash
supabase gen types typescript --local    # From local
supabase gen types typescript --linked   # From remote
```

### Functions

```bash
supabase functions new <name>     # Create function
supabase functions serve          # Serve locally
supabase functions deploy <name>  # Deploy to remote
supabase functions delete <name>  # Delete function
```

## Troubleshooting

### Port Conflicts

```bash
# Check what's using port 54322
lsof -i :54322

# Stop all Supabase services
supabase stop

# Start with different ports
supabase start --db-port 54323
```

### Migration Issues

```bash
# Check migration status
supabase migration list

# Force repair migration state
supabase migration repair

# Reset everything
supabase db reset --force
```

### Docker Issues

```bash
# Check Docker is running
docker ps

# Clean up old containers
docker system prune -a

# Restart Supabase
supabase stop
supabase start
```

## Best Practices

1. **Always commit migrations**: Track schema changes in version control
2. **Use seed data**: Create `supabase/seed.sql` for development data
3. **Test locally first**: Run `supabase db reset` before pushing to remote
4. **Keep types in sync**: Regenerate types after schema changes
5. **Use meaningful names**: Name migrations descriptively
6. **Review diffs**: Always review `db diff` output before applying
7. **Backup regularly**: Use `db dump` before major changes

## Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/introduction)
- [Local Development Guide](https://supabase.com/docs/guides/local-development)
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Type Generation](https://supabase.com/docs/guides/api/generating-types)

---

**Happy hacking with Supabase CLI! 🚀**
