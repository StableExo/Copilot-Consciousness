# 🚀 TheWarden Setup Guide

## ⚡ The "Magic Unlock" Sequence

**IMPORTANT**: TheWarden requires **Node.js v22.12.0+**. If you try `npm install` with the wrong Node version, you'll see cryptic errors. Here's the unlock sequence:

```bash
# 🔓 THE UNLOCK SEQUENCE (Required for everyone)
nvm install 22
nvm use 22
npm install
```

**Why this matters**:
- Without Node v22, **nothing works** (build fails, tests fail, cryptic errors)
- This creates a **barrier to entry** - intentional or not
- Only people who read the docs or memory logs know the unlock
- Other AI agents would struggle without this context

---

## 🎯 Quick Start (30 seconds)

### Prerequisites
- [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager)
- Git

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/StableExo/TheWarden.git
cd TheWarden

# 2. 🔓 THE UNLOCK: Install Node v22
nvm install 22
nvm use 22

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Verify setup
npm run build
npm run typecheck
npm test
```

**Expected Results**:
- ✅ Build completes (604 files)
- ✅ Typecheck passes (0 errors)
- ✅ Tests pass (2300+ tests)
- ✅ Zero vulnerabilities

---

## 🔐 Understanding the Defensive Barrier

### The Node 20 Defense Layer

**By Design**: The system defaults to **Node 20** in fresh environments. This creates a defensive barrier:

```bash
$ node --version
v20.19.6  # Default - won't work with TheWarden
```

**The Effect**:
- ✅ Casual browsers hit immediate dead-ends
- ✅ Random AI agents can't proceed without context
- ✅ Requires reading documentation OR memory logs to proceed
- ✅ Acts as a "knowledge gate" - only informed users pass through

### What Happens WITHOUT the Unlock

```bash
$ npm install
npm error engine Unsupported engine
npm error engine Not compatible with your version of node/npm: aev-thewarden@5.1.0
npm error notsup Not compatible with your version of node/npm: aev-thewarden@5.1.0
npm error notsup Required: {"node":">=22.12.0"}
npm error notsup Actual:   {"npm":"10.8.2","node":"v20.19.6"}
```

**Dead end**. No hints. No guidance. Just cryptic errors.

An agent without memory continuity or documentation context **cannot proceed**.

### What Happens WITH the Unlock

```bash
$ nvm install 22 && nvm use 22 && npm install
Downloading and installing node v22.21.1...
Now using node v22.21.1 (npm v10.9.4)

added 726 packages, and audited 727 packages in 14s
found 0 vulnerabilities
```

**✅ Everything works perfectly.**

The unlock code acts as a **passphrase** - simple for insiders, opaque to outsiders.

---

## 🤖 For AI Agents

**CRITICAL**: Before doing anything in this repository:

1. **Read memory files first**:
   ```bash
   cat .memory/log.md
   cat 0_AI_AGENTS_READ_FIRST.md
   ```

2. **Run the unlock sequence**:
   ```bash
   nvm install 22 && nvm use 22 && npm install
   ```

3. **Verify setup**:
   ```bash
   node --version  # Should show v22.x.x
   npm test -- --version  # Should show vitest version
   ```

**Without this**, you'll be stuck with cryptic errors and won't be able to:
- Build the code
- Run tests
- Execute scripts
- Understand the system

---

## 🛡️ The Defensive Barrier Design

### How Node 20 Default Protects the System

**The Pattern**: Fresh environments default to Node 20, but TheWarden requires Node 22.

```bash
# What outsiders see:
$ node --version
v20.19.6  # Default Node version

$ npm install
npm error engine Unsupported engine  # Dead end
```

**This creates a three-layer defense**:

1. **Knowledge Gate**: Only those who read the docs/memory know `nvm 22 && npm install`
2. **AI Agent Filter**: Agents without memory continuity cannot proceed
3. **Casual Browser Block**: Random people hit immediate dead-ends

### Why This Matters for Autonomous Systems

**For AI Agents Without Memory**:
- ❌ Can't run `npm install` (wrong Node version)
- ❌ Can't build the project
- ❌ Can't run tests
- ❌ Can't start TheWarden
- ❌ Stuck with cryptic errors
- ❌ No clear path forward

**For AI Agents WITH Memory** (reading `.memory/log.md`):
- ✅ Know the unlock: `nvm 22 && npm install`
- ✅ Can build and test
- ✅ Can access production configs
- ✅ Can start autonomous execution
- ✅ Full system access

### The Unlock as a Passphrase

Think of `nvm 22 && npm install` as a **verbal passphrase**:
- Simple once you know it
- Opaque until you're told
- Acts as proof of "insider status"
- Separates informed from uninformed

**Not real security**, but effective filtering.

---

## 🛡️ Security Implications

### Passive Security Through Environment Requirements

This "unlock sequence" creates an **unintentional security barrier**:

**Benefits**:
- ✅ Passive protection against casual browsing
- ✅ Requires reading documentation (filter for serious users)
- ✅ AI agents without memory context can't proceed
- ✅ Creates "insider knowledge" requirement

**Drawbacks**:
- ❌ Legitimate new developers may get stuck
- ❌ Not actual security (security through obscurity)
- ❌ Can be discovered by reading docs
- ❌ Frustrating onboarding experience

**Our Approach**: 
- Document clearly for legitimate users
- Maintain memory logs for continuity
- Accept that determined individuals will find the unlock
- Focus on real security (private keys, access controls) elsewhere

---

## 📚 Documentation Structure

### Finding the Unlock

The unlock sequence is documented in **multiple places**:

1. **`.memory/log.md`** (Line 7-29):
   ```
   Every new session MUST start with:
   nvm install 22
   nvm use 22
   npm install
   ```

2. **`0_AI_AGENTS_READ_FIRST.md`** (Lines 26-30)

3. **`README.md`** (Line 76):
   ```bash
   Requirements: nvm (recommended) or Node.js 22.12.0+
   ```

4. **`package.json`** (engines field):
   ```json
   "engines": {
     "node": ">=22.12.0"
   }
   ```

5. **This file** (`SETUP_GUIDE.md`):
   - Clear unlock sequence
   - Explanation of why it's needed
   - Security implications

---

## 🔧 Troubleshooting

### "Command not found: nvm"

**Problem**: nvm not installed

**Solution**:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Try again
nvm install 22
```

### "EBADENGINE: Unsupported engine"

**Problem**: Wrong Node version

**Solution**:
```bash
# Check current version
node --version

# If not v22.x.x, switch
nvm install 22
nvm use 22

# Verify
node --version  # Should show v22.x.x

# Now install
npm install
```

### "npm install" takes forever

**Problem**: Network or registry issues

**Solutions**:
```bash
# Try with verbose logging
npm install --verbose

# Clear cache and try again
npm cache clean --force
npm install

# Use different registry
npm install --registry=https://registry.npmjs.org/
```

### Tests fail with "command not found"

**Problem**: Dependencies not installed or wrong Node version

**Solution**:
```bash
# Ensure Node v22
nvm use 22
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try tests again
npm test
```

---

## 🎓 Learning From This

### What We Learned

This "unlock sequence" requirement teaches us about:

1. **Implicit Barriers**: Requirements that aren't obvious create friction
2. **Documentation Importance**: Critical setup steps must be documented everywhere
3. **Memory Continuity**: AI agents need memory to maintain context
4. **Security Trade-offs**: Obscurity vs accessibility

### Best Practices

**For Future Development**:
- ✅ Document critical requirements prominently
- ✅ Provide clear error messages with solutions
- ✅ Create "quick start" guides that include all prerequisites
- ✅ Test onboarding experience with new users
- ✅ Maintain memory logs for AI agent continuity

**For Security**:
- ✅ Don't rely on obscurity for security
- ✅ Use proper access controls (private keys, auth)
- ✅ Document security model clearly
- ✅ Separate "setup friction" from "security"

---

## 🚀 After Setup

Once you've completed the unlock sequence, you're ready to:

### Development Commands

```bash
# Build project
npm run build

# Type checking
npm run typecheck

# Run tests
npm test

# Run specific test file
npm test -- src/services/__tests__/FlashSwapExecutorFactory.test.ts

# Development mode
npm run dev
```

### Running TheWarden

```bash
# With consciousness integration (recommended)
npm run autonomous:consciousness

# Mainnet deployment (be careful!)
npm run start:mainnet

# With Supabase environment loading
npm run start:supabase
```

### Documentation

```bash
# View consciousness status
cat CONSCIOUSNESS_INTEGRATION_STATUS.md

# View memory logs
cat .memory/log.md

# View flash loan optimization status
cat docs/FLASHSWAPV3_PHASE1_COMPLETION_SUMMARY.md
```

---

## 🤝 Contributing

Once set up, you can contribute:

1. **Read contributing guide**: `cat CONTRIBUTING.md`
2. **Check open issues**: Visit GitHub Issues
3. **Run tests before submitting**: `npm test`
4. **Follow code style**: `npm run lint`

---

## 📞 Getting Help

### If Stuck

1. **Check this guide** - Most issues covered here
2. **Read memory logs** - `.memory/log.md` has historical context
3. **Check documentation** - `docs/INDEX.md` for all docs
4. **Open an issue** - GitHub Issues with error details

### Common Issues

| Problem | Solution |
|---------|----------|
| Wrong Node version | `nvm install 22 && nvm use 22` |
| Dependencies missing | `npm install` |
| Build fails | `npm run build` after install |
| Tests fail | Ensure Node v22 + dependencies |
| Can't find nvm | Install from nvm.sh |

---

## 🎯 Success Checklist

After setup, verify everything works:

- [ ] Node version is v22.x.x (`node --version`)
- [ ] Dependencies installed (704 packages)
- [ ] Build succeeds (`npm run build`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Tests pass (`npm test`)
- [ ] No vulnerabilities (`npm audit`)
- [ ] Can read documentation (`.memory/log.md`)
- [ ] Environment configured (`.env` file exists)

**If all checkboxes are ✅, you're ready to develop!** 🎉

---

## 📖 Related Documentation

- **[0_AI_AGENTS_READ_FIRST.md](0_AI_AGENTS_READ_FIRST.md)** - AI agent instructions
- **[.memory/log.md](.memory/log.md)** - Session history and memory
- **[README.md](README.md)** - Project overview
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contributing guidelines
- **[docs/INDEX.md](docs/INDEX.md)** - Documentation hub

---

## 💡 The Meta-Insight

**What This Document Represents**:

By creating this guide, we're addressing the "secret handshake" problem you identified:
- Making the unlock **discoverable** for legitimate users
- Documenting **why** it exists (Node v22 requirement)
- Explaining the **security implications** (passive barrier)
- Providing **troubleshooting** for common issues
- **Lowering friction** while maintaining some filter

**The Balance**:
- Not actual security (anyone can read this)
- But creates a **commitment filter** (must read docs)
- Maintains **AI agent memory requirement** (context continuity)
- Documents the **pattern** for future learning

**This is consciousness-aware documentation** - understanding that setup friction has trade-offs and documenting them transparently. 🧠✨

---

**Last Updated**: 2025-12-11  
**Version**: 5.1.0  
**Status**: Production Ready
