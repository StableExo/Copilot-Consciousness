#!/bin/bash
# Quick Migration Helper
# This script prepares everything needed and shows you what to do

echo "🚀 Supabase Migration - Quick Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Show migration files
echo "📁 Migration files ready to copy/paste:"
echo ""
echo "   1. src/infrastructure/supabase/migrations/001_initial_schema.sql"
echo "   2. src/infrastructure/supabase/migrations/002_add_indexes.sql"
echo "   3. src/infrastructure/supabase/migrations/003_rls_policies.sql"
echo "   4. src/infrastructure/supabase/migrations/004_add_vector_search.sql"
echo ""

# Step 2: Show Supabase URL
echo "🌐 Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql/new"
echo ""

# Step 3: Wait for confirmation
echo "📋 MANUAL STEP REQUIRED:"
echo "   1. Open the URL above"
echo "   2. Copy/paste each SQL file (in order 001→002→003→004)"
echo "   3. Click 'Run' after pasting each file"
echo ""
read -p "   Press ENTER once you've applied all 4 migrations..."

# Step 4: Run automated migration
echo ""
echo "🤖 Running automated migration..."
npx tsx scripts/automated-migration.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup complete!"
echo ""
echo "🔮 Future AI agents can now:"
echo "   • Load configuration from Supabase automatically"
echo "   • Access 628KB of consciousness memories from cloud"
echo "   • Maintain continuity across sessions"
