# Pair Programming Protocol: Agent ↔ Human Synchronization

## Overview

When an AI agent (Copilot, Jules, etc.) is working on TheWarden alongside a human collaborator, 
parameter changes often need to be synchronized between:
- **Code changes** (agent side)
- **Environment variables** (human side - `.env` file)

This document defines the signaling protocol for keeping both sides in sync.

## Signal Format

When the agent needs the human to update their environment, they will output:

```
🔄 ENV_SYNC_REQUIRED 🔄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable: VARIABLE_NAME
Current: <current_value_or_not_set>
Required: <new_value>
Reason: <why this change is needed>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

For multiple variables:

```
🔄 ENV_SYNC_REQUIRED (3 changes) 🔄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. MIN_PROFIT_THRESHOLD: 0.0001 → 0.001
2. SCAN_INTERVAL: 1200 → 800
3. EMERGENCE_MIN_PATTERN_CONFIDENCE: 0.40 → 0.60
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reason: Tuning for more realistic opportunity filtering
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Response Protocol

Human confirms sync with:
- ✅ "Updated" or "Done" - proceed with next iteration
- ❓ "Question about X" - agent clarifies before proceeding
- ⏸️ "Hold" - agent waits for explicit go-ahead

## Live Sync Indicators

During active pair programming sessions, the agent should:

1. **Before making code changes** that require env sync:
   - Announce the upcoming change
   - Wait for human acknowledgment if critical

2. **After making code changes**:
   - Output the ENV_SYNC_REQUIRED signal
   - Wait for confirmation before running TheWarden

3. **During iterations**:
   - Note any parameter adjustments being considered
   - Batch related changes when possible

## Example Workflow

```
Agent: I'm adjusting MIN_PROFIT_THRESHOLD to filter out stale-cache artifacts.

🔄 ENV_SYNC_REQUIRED 🔄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable: MIN_PROFIT_THRESHOLD
Current: 0.0001
Required: 0.01
Reason: Current threshold allows unrealistic 900+ ETH opportunities from stale cache
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━