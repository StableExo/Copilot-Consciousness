# Environment Setup Commands - For Your Terminal

**Last Updated**: December 9, 2025  
**Purpose**: Exact commands to run in your terminal to match the working environment

---

## Problem: Node.js Version Mismatch

The repository requires **Node.js 22.12.0** but systems often have an older version installed (like 20.x).

---

## Solution: Use NVM (Node Version Manager)

### Step 1: Check Current Node Version

```bash
node --version
```

If you see `v20.x.x` or older, you need to upgrade.

---

### Step 2: Install/Use Node 22.12.0

**Option A: If you have NVM installed** (recommended):

```bash
# Load NVM into your current shell session
source ~/.nvm/nvm.sh

# Install Node 22.12.0 (only needed once)
nvm install 22.12.0

# Use Node 22.12.0 (for current terminal session)
nvm use 22.12.0

# Verify it worked
node --version
# Should show: v22.12.0

npm --version
# Should show: 10.9.0
```

**Option B: If you don't have NVM**:

Install NVM first:
```bash
# Download and install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Or with wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Close and reopen your terminal, then run:
source ~/.nvm/nvm.sh
nvm install 22.12.0
nvm use 22.12.0
```

---

### Step 3: Install Dependencies

```bash
# Navigate to the repository (if not already there)
cd /path/to/TheWarden

# Install all dependencies (this will take 1-2 minutes)
npm install
```

**Expected Output**:
```
added 704 packages, and audited 705 packages in 14s
found 0 vulnerabilities
```

---

### Step 4: Build TypeScript

```bash
# Compile TypeScript to JavaScript
npm run build
```

**Expected**: You'll see some TypeScript errors in CEX/bloXroute code (these are pre-existing, not from new changes). The build will complete despite these errors, and the MCP tools will be compiled successfully to `dist/src/mcp/servers/Phase2ToolsServer.js`.

**To verify the important files compiled**:
```bash
ls -la dist/src/mcp/servers/Phase2ToolsServer.js
# Should show: -rw-r--r-- ... Phase2ToolsServer.js
```

---

### Step 5: Verify Everything Works

```bash
# Check Node version is correct
node --version
# Should show: v22.12.0

# Check npm is correct version
npm --version
# Should show: 10.9.0

# Check dependencies installed
ls node_modules | wc -l
# Should show: ~700+ directories

# Check dist was created
ls dist/src/mcp/servers/
# Should show: ConsciousnessSystemServer.js, MemoryCoreToolsServer.js, Phase2ToolsServer.js
```

---

## Persistent Setup (Recommended)

To avoid running `source ~/.nvm/nvm.sh` and `nvm use 22.12.0` every time:

### Option 1: Make Node 22 the Default

```bash
# Set Node 22.12.0 as default for all new terminals
nvm alias default 22.12.0

# Now Node 22 will be used automatically in new terminals
```

### Option 2: Add to Shell Profile

Add these lines to `~/.bashrc` or `~/.zshrc` (depending on your shell):

```bash
# Add to ~/.bashrc or ~/.zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # Load nvm

# Optional: Auto-use .nvmrc when entering directories
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

Then reload your shell:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

---

## Quick Reference: One-Command Setup

If you need to set up quickly in a new terminal session:

```bash
# Single command chain (copy-paste this entire line)
source ~/.nvm/nvm.sh && nvm use 22.12.0 && npm install && npm run build
```

---

## Troubleshooting

### Problem: `nvm: command not found`

**Solution**: NVM not installed or not in PATH
```bash
# Check if NVM directory exists
ls -la ~/.nvm

# If it exists but command not found, add to shell profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc

# If it doesn't exist, install NVM (see Step 2, Option B above)
```

### Problem: `npm install` fails with "Unsupported engine"

**Solution**: You're not using Node 22.12.0
```bash
# Verify node version
node --version

# If wrong version, switch to 22.12.0
source ~/.nvm/nvm.sh
nvm use 22.12.0
node --version  # Verify it shows v22.12.0

# Now try npm install again
npm install
```

### Problem: Build has errors

**Solution**: Some TypeScript errors are expected (pre-existing in CEX/bloXroute code)
```bash
# Check if the important files compiled despite errors
ls -la dist/src/mcp/servers/Phase2ToolsServer.js

# If Phase2ToolsServer.js exists, you're good!
# The errors in other files don't block MCP tools
```

### Problem: Terminal doesn't remember Node version

**Solution**: Set Node 22 as default
```bash
nvm alias default 22.12.0

# Verify in new terminal
# Close current terminal and open new one
node --version  # Should show v22.12.0
```

---

## For Different Shells

### Bash (most common on Linux)
```bash
# Edit ~/.bashrc
nano ~/.bashrc

# Add these lines at the end:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Save and reload
source ~/.bashrc
```

### Zsh (default on macOS)
```bash
# Edit ~/.zshrc
nano ~/.zshrc

# Add these lines at the end:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Save and reload
source ~/.zshrc
```

### Fish
```bash
# Install bass first (for NVM compatibility)
fisher install edc/bass

# Add to ~/.config/fish/config.fish
function nvm
   bass source ~/.nvm/nvm.sh --no-use ';' nvm $argv
end
```

---

## Testing the Setup

After setup, run these commands to verify everything works:

```bash
# 1. Check Node version
node --version
# Expected: v22.12.0

# 2. Check npm version  
npm --version
# Expected: 10.9.0

# 3. Check dependencies
ls node_modules | head -5
# Should show: Some package names

# 4. Check build output
ls dist/src/mcp/servers/
# Should show: ConsciousnessSystemServer.js, MemoryCoreToolsServer.js, Phase2ToolsServer.js

# 5. Test TypeScript can run
node --import tsx src/mcp/servers/Phase2ToolsServer.ts
# Should start without immediate errors (Ctrl+C to stop)
```

---

## Summary: The Minimal Commands

**Every time you open a new terminal** (if not set as default):
```bash
source ~/.nvm/nvm.sh
nvm use 22.12.0
```

**First time setup only**:
```bash
# Install NVM (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh

# Install Node 22.12.0
nvm install 22.12.0
nvm use 22.12.0

# Make it default (optional but recommended)
nvm alias default 22.12.0

# Install dependencies
cd /path/to/TheWarden
npm install

# Build
npm run build
```

**To make permanent** (add to shell profile):
```bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc
```

---

## Why This Works

The key insight is that **each terminal session needs NVM loaded**. The command `source ~/.nvm/nvm.sh` loads NVM into the current session, making `nvm` available. Then `nvm use 22.12.0` switches that session to Node 22.12.0.

By adding the NVM loading to your shell profile (`.bashrc` or `.zshrc`), it runs automatically in every new terminal.

---

**After this setup, you should have Node 22.12.0, all dependencies installed, and the MCP tools built successfully!** ✅

**Need help?** Check which shell you're using with: `echo $SHELL`
