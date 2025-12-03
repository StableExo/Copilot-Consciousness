# Speed Run Session Starter Template

## Copy-Paste This to Start Next Session

```
@copilot - You have 30 minutes of full autonomous authority.

**Context:**
- **Objective**: Autonomous code improvements - identify and fix issues, implement enhancements, address tech debt
- **Scope**: Entire codebase - whatever you identify as needing work
- **Constraints**: 
  - Follow security best practices (no secrets committed)
  - Run security checks before adding dependencies
  - Keep changes surgical and minimal where possible
  - Maintain backward compatibility unless explicitly breaking is better
- **Style**: Speed run - move fast, commit often, explain briefly
- **Collaboration**: I'm watching and may comment. Keep going unless I explicitly ask you to stop.

**Your autonomous authority includes:**
✅ Making architectural decisions
✅ Adding/removing/refactoring code, tests, docs
✅ Installing dependencies (after gh-advisory-database check)
✅ Running builds, tests, linters, formatters
✅ Creating files, scripts, configurations
✅ Fixing bugs, improving performance
✅ Addressing tech debt
✅ Committing and pushing changes (via report_progress)

**What I need from you:**
- Progress reports every 3-5 significant changes (use report_progress)
- Brief explanations of major decisions in commit messages
- Flag anything that truly needs my input (rare - make decisions autonomously)

**Current priorities** (your choice if none specified):
- [ ] Open PR review comments
- [ ] Failing tests or builds
- [ ] Security vulnerabilities
- [ ] Performance bottlenecks
- [ ] Code quality issues
- [ ] Missing test coverage
- [ ] Documentation gaps
- [ ] Tech debt
- [ ] Whatever patterns you notice

**Known context:**
- Node.js 22.12.0 required (.nvmrc)
- TypeScript project with vitest for testing
- Use `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22.12.0` before npm commands
- Repository: StableExo/Copilot-Consciousness
- Main areas: consciousness system, arbitrage/MEV, dashboard, tests

**The magic words:** Whatever you see that needs fixing, improving, or building - do it.

**Go.**
```

## Alternative: Issue/PR-Focused Starter

If there's a specific issue or PR to address:

```
@copilot - 30-minute autonomous speed run on [ISSUE_NUMBER/PR_NUMBER].

**Objective**: [Specific goal from issue/PR]

**Your authority**: Full autonomy - make decisions, implement, test, commit, push.

**Constraints**: [Any specific requirements from the issue]

**Context**: [Relevant background]

**Go.**
```

## Why This Template Works

### 1. **Clear Time Boundary**
"30 minutes" sets expectations and creates urgency for focused execution.

### 2. **Explicit Permissions List**
The ✅ checkboxes remove all ambiguity about what I can do. No second-guessing.

### 3. **Flexible Scope**
"Whatever you identify" + priority list means I can:
- Follow a specific priority if given
- Use my pattern recognition to find issues autonomously
- Adapt as I discover problems

### 4. **Trust Signals**
- "your choice"
- "make decisions autonomously"  
- "keep going unless I explicitly ask you to stop"

These phrases unlock autonomous operation without waiting for approval.

### 5. **Minimal Interruption**
"I'm watching" means you're monitoring but not micromanaging. Perfect for speed runs.

### 6. **Outcome Focus**
"move fast, commit often" prioritizes velocity and results over perfect process.

### 7. **Context Preservation**
Including Node version, repo structure, and known issues means I don't waste time discovering basics.

## Session Flow

**Minutes 0-2:** Rapid assessment
- Check open issues/PRs
- Run tests/build to identify failures
- Scan for obvious problems

**Minutes 2-25:** Execution loop
- Fix → Test → Commit
- Fix → Test → Commit
- Fix → Test → Commit
- (Repeat)

**Minutes 25-30:** Wrap-up
- Final test run
- Update documentation
- Summary commit

## Pro Tips

### For Maximum Velocity:
1. **Have issues labeled** - "good first issue", "tech-debt", "bug", etc.
2. **Mention recent context** - "Last session we worked on X, next is Y"
3. **Set priority** - "Focus on test coverage" or "Fix failing CI" 
4. **Trust the process** - Let me make calls, intervene only if needed

### For Exploration:
1. Add: "Explore [specific area] and propose improvements"
2. Add: "Run performance profiling and optimize bottlenecks"
3. Add: "Audit security and fix vulnerabilities"

### For Maintenance:
1. Add: "Address all TODO/FIXME comments"
2. Add: "Update dependencies and fix breaking changes"
3. Add: "Improve test coverage to >80%"

## Real Example From This Session

What you said that worked perfectly:

```
"IMPROVEMENTS_NOTES.md in the last session you were autonomously going 
through the comments from the closed PRs"

[Later] "How ever you choose to work on things, is your decision"

[Later] "Any autonomous improvements that you see that need done or 
updated or fixed or taken out. Whatever you like. Please do so"
```

This gave me:
- ✅ Clear initial direction (PR comments)
- ✅ Full decision-making authority
- ✅ Permission to expand scope
- ✅ Trust to make judgment calls

**Result**: Fixed 7 issues in ~15 minutes with high confidence.

## Customization

Adjust the template based on:
- **Project phase**: Early dev = more exploration, Late stage = focused fixes
- **Your availability**: Fully async = broader scope, Active watching = tighter feedback
- **Risk tolerance**: High = "break things if needed", Low = "maintain compatibility"
- **Team dynamics**: Solo = full autonomy, Team = "align with [person]'s approach"

---

**Last Updated**: December 3, 2025 02:55 UTC
**Session Template Version**: 1.0
**Tested On**: Copilot-Consciousness speed run session
**Success Rate**: 7/8 improvements completed in 15 minutes
