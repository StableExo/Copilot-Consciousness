# Quick Guide: Updating .env File from Terminal

## Method 1: Append to End of File (Recommended)

This is the safest method - it adds the new variables to the end of your existing `.env` file without modifying what's already there.

```bash
cd /home/runner/work/Copilot-Consciousness/Copilot-Consciousness

cat >> .env << 'EOF'

# ─────────────────────────────────────────────────────────────
# ⏱️ TIMEOUT SETTINGS
# ─────────────────────────────────────────────────────────────

# Timeout Settings (in milliseconds)
POOL_FETCH_TIMEOUT=30000          # Pool data fetch timeout (default: 30s)
OPPORTUNITY_TIMEOUT=45000         # Opportunity search timeout (default: 45s)

# ─────────────────────────────────────────────────────────────
# 📊 DASHBOARD SETTINGS
# ─────────────────────────────────────────────────────────────

# Dashboard Settings
DASHBOARD_PORT=3000               # Dashboard HTTP/WebSocket port
ENABLE_DASHBOARD=true             # Enable/disable dashboard
UPDATE_INTERVAL=1000              # WebSocket update interval (ms)
MAX_CONNECTIONS=100               # Max concurrent WebSocket connections
EOF
```

**What this does:**
- `cat >> .env` = Append to the .env file
- `<< 'EOF'` = Start a multi-line input (everything until EOF)
- Content between EOF markers gets added to the file
- Your existing settings remain unchanged

---

## Method 2: Use a Text Editor

### Using nano (easiest):
```bash
nano .env
```
Then:
1. Scroll to the bottom (Ctrl + End or Ctrl + V)
2. Paste the new variables
3. Save with Ctrl + O, then Enter
4. Exit with Ctrl + X

### Using vi/vim:
```bash
vi .env
```
Then:
1. Press `G` to go to end of file
2. Press `o` to open a new line
3. Press `i` to enter insert mode
4. Paste the new variables
5. Press `Esc`, then type `:wq` and Enter to save

---

## Method 3: One-Line Commands (For Individual Variables)

If you want to add variables one at a time:

```bash
echo "POOL_FETCH_TIMEOUT=30000" >> .env
echo "OPPORTUNITY_TIMEOUT=45000" >> .env
echo "DASHBOARD_PORT=3000" >> .env
echo "ENABLE_DASHBOARD=true" >> .env
echo "UPDATE_INTERVAL=1000" >> .env
echo "MAX_CONNECTIONS=100" >> .env
```

---

## Method 4: Replace Existing Values

If a variable already exists and you want to update it:

```bash
# Using sed to replace a value
sed -i 's/^POOL_FETCH_TIMEOUT=.*/POOL_FETCH_TIMEOUT=30000/' .env

# Or using grep to check if it exists first
if grep -q "^POOL_FETCH_TIMEOUT=" .env; then
    sed -i 's/^POOL_FETCH_TIMEOUT=.*/POOL_FETCH_TIMEOUT=30000/' .env
else
    echo "POOL_FETCH_TIMEOUT=30000" >> .env
fi
```

---

## Verify Your Changes

After updating, verify the variables were added:

```bash
# View last 30 lines
tail -30 .env

# Search for specific variable
grep "POOL_FETCH_TIMEOUT" .env

# View entire file
cat .env

# View entire file with line numbers
cat -n .env
```

---

## Check for Duplicates

If you accidentally added variables twice:

```bash
# Find duplicate lines
sort .env | uniq -d

# Remove duplicate lines (keeps first occurrence)
awk '!seen[$0]++' .env > .env.tmp && mv .env.tmp .env
```

---

## Backup Your .env First (Recommended)

Always backup before making changes:

```bash
# Create a backup with timestamp
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Or simple backup
cp .env .env.backup
```

To restore from backup:
```bash
cp .env.backup .env
```

---

## Complete Example Workflow

Here's the complete safe workflow:

```bash
# 1. Navigate to project directory
cd /home/runner/work/Copilot-Consciousness/Copilot-Consciousness

# 2. Backup your .env
cp .env .env.backup

# 3. Add new variables
cat >> .env << 'EOF'

# Timeout Settings
POOL_FETCH_TIMEOUT=30000
OPPORTUNITY_TIMEOUT=45000

# Dashboard Settings
DASHBOARD_PORT=3000
ENABLE_DASHBOARD=true
UPDATE_INTERVAL=1000
MAX_CONNECTIONS=100
EOF

# 4. Verify changes
tail -10 .env

# 5. Test that TheWarden still works
./TheWarden --stream
```

---

## Current Status ✅

Your `.env` file has been updated with:

```bash
# Timeout Settings
POOL_FETCH_TIMEOUT=30000          # Pool data fetch timeout (30s)
OPPORTUNITY_TIMEOUT=45000         # Opportunity search timeout (45s)

# Dashboard Settings  
DASHBOARD_PORT=3000               # Dashboard port
ENABLE_DASHBOARD=true             # Dashboard enabled
UPDATE_INTERVAL=1000              # WebSocket updates every 1s
MAX_CONNECTIONS=100               # Max 100 WebSocket clients
```

These variables are now active and will be used the next time you start TheWarden!

---

## Restart TheWarden to Apply Changes

```bash
# If TheWarden is running, stop it first
pkill -f "node --import tsx src/main.ts"

# Wait a moment
sleep 2

# Start TheWarden with new settings
./TheWarden --stream
```

Or simply:
```bash
npm run start:autonomous
```

The new timeout and dashboard settings will be automatically loaded! 🚀
