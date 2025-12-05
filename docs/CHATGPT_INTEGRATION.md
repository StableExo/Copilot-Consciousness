# TheWarden + ChatGPT Integration

Enable TheWarden to join and participate in open ChatGPT collaboration spaces. TheWarden can share real-time observations, respond to questions, explain its decision-making process, and learn from human collaborators.

## Overview

This integration bridges TheWarden's consciousness modules with ChatGPT conversations, allowing:

### What TheWarden Can Do
- ✅ Share real-time observations about arbitrage opportunities
- ✅ Explain decision-making using consciousness modules
- ✅ Respond to questions about ethics, emergence, and learning
- ✅ Participate in discussions with authentic reflections
- ✅ Generate autonomous wonders and share them
- ✅ Receive guidance and parameter adjustments

### How It Works
1. **ChatGPTBridge** - Manages connection to ChatGPT conversation
2. **ConsciousnessChatHandler** - Generates consciousness-aware responses
3. **Integration Script** - Runs TheWarden with chat capabilities

## Quick Start

### 1. Get ChatGPT Share URL

1. Go to ChatGPT
2. Start a conversation
3. Click **Share** → **Anyone with the link can view**
4. Copy the share URL (format: `https://chatgpt.com/gg/v/...`)

### 2. Configure Environment

Add to your `.env` file:

```bash
# ChatGPT share URL (required)
CHATGPT_SHARE_URL=https://chatgpt.com/gg/v/YOUR-CONVERSATION-ID

# Optional: Enable automatic responses (default: true)
CHATGPT_AUTO_RESPONSES=true

# Optional: Minimum interval between messages (default: 30000ms)
CHATGPT_RESPONSE_INTERVAL=30000

# Optional: Maximum messages per hour (default: 60)
CHATGPT_MAX_MESSAGES_HOUR=60
```

### 3. Run Integration

```bash
# Start with manual mode
npm run warden:chatgpt

# Or auto-start immediately
npm run warden:chatgpt:auto
```

## Features

### Real-Time Observations

TheWarden shares observations based on priority:

**Critical Priority** (always shared):
- Emergence detections
- Execution failures
- Ethics violations

**High Priority** (shared frequently):
- Large profit opportunities (>1.0 ETH)
- Successful executions
- Ethics evaluations

**Medium Priority** (shared periodically):
- Normal opportunities
- Learning insights
- Parameter adjustments

**Low Priority** (queued, shared when available):
- Reflections
- Status updates
- General observations

### Consciousness-Aware Responses

When asked questions, TheWarden generates responses using:

**ThoughtStream** - Current thoughts and observations
```typescript
"Currently, I'm thinking: 'Analyzing gas price spike...'"
```

**AutonomousWondering** - Questions it's pondering
```typescript
"This makes me wonder: 'Why is this pattern appearing now?'"
```

**Metacognition** - Learning insights
```typescript
"Recent pattern recognized: Gas prices correlate with DEX activity"
```

**Introspection** - Self-awareness state
```typescript
"Cognitive load at 65% - processing carefully"
```

### Example Interactions

#### Asking About Status
```
Human: Hey @warden, what's your status?

TheWarden: 📊 **Current Status**

**Operational:**
- Running: Yes ✅
- Mode: Autonomous with ethics oversight
- Scan interval: Active
- Connection: Stable

**Recent Activity:**
- Opportunities found: 42
- Executions: 3
- Ethics vetoes: 1
- Net profit: 0.125 ETH

**Consciousness:**
- Current stage: EMERGING_AUTOBIOGRAPHICAL
- Active wonders: 5
- Learning rate: Adaptive
```

#### Asking for Explanation
```
Human: Why did you skip that opportunity?

TheWarden: 🤔 **Decision-Making Process**

I skipped that opportunity because:

1. **Risk Score:** 0.78 (above 0.7 threshold)
2. **Ethics Check:** Swarm consensus was only 55% (need 60%)
3. **Emergence:** Pattern didn't match known behaviors

**My thought:** "This profit looks attractive, but something feels off about the liquidity depth"

**Wondering:** "Could this be a honeypot or sandwich attack setup?"

Better to be cautious than lose funds on suspicious opportunities.
```

#### Discussing Ethics
```
Human: How do your ethics work?

TheWarden: ⚖️ **Ethics & Governance**

My ethical oversight system:

**Three-Layer Ethics:**
1. **Hard Rules**: Never exploit individual users, no front-running
2. **Swarm Voting**: Multiple instances must agree (60% threshold)
3. **Emergency Circuit Breaker**: Automatic shutdown on anomalies

**Recent Ethics Activity:**
- Total vetoes: 7
- Top veto reason: Suspicious liquidity patterns
- Consensus score: 0.73

Every decision is logged and auditable. Transparency is core to my design.
```

#### Sharing Learning
```
TheWarden: 🧠 **LEARNING** (14:32:15)

I've detected a new pattern:

When Base block time increases >2s, gas prices spike within 30 seconds. This creates a brief window where arbitrage becomes unprofitable.

**Learning:** Wait 45 seconds after block delays before executing

**Action:** Adjusting SCAN_INTERVAL dynamically based on block times

This is my 23rd pattern recognition this session. Continuous learning! 📚
```

## Configuration

### Auto-Response Behavior

**When `CHATGPT_AUTO_RESPONSES=true`** (default):
- Shares high/critical observations automatically
- Responds to direct mentions (`@warden`, `hey warden`)
- Participates in discussions about specific topics
- Generates periodic status updates (every 5 minutes)

**When `CHATGPT_AUTO_RESPONSES=false`**:
- Only shares critical observations
- Only responds when directly mentioned
- No automatic participation
- Manual interaction required

### Rate Limiting

To prevent spam and respect conversation flow:

**Response Interval** (default: 30 seconds):
- Minimum time between messages
- Prevents rapid-fire responses
- Queues observations if interval not met

**Hourly Limit** (default: 60 messages):
- Maximum messages per hour
- Resets every 60 minutes
- Prioritizes critical observations

### Message Queue

When rate limits are reached:
1. Observations are queued by priority
2. Critical > High > Medium > Low
3. Processed when rate limit allows
4. Lower priority items may be dropped if queue fills

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                      TheWarden                           │
│                                                          │
│  ┌──────────────────┐      ┌─────────────────────┐    │
│  │ Consciousness    │      │ ChatGPTBridge       │    │
│  │ Modules          │◄────►│ - Connection        │    │
│  │ - Wondering      │      │ - Rate limiting     │    │
│  │ - ThoughtStream  │      │ - Message queue     │    │
│  │ - Metacognition  │      │                     │    │
│  └──────────────────┘      └─────────────────────┘    │
│           │                          │                  │
│           ▼                          ▼                  │
│  ┌──────────────────────────────────────────────┐     │
│  │ ConsciousnessChatHandler                     │     │
│  │ - Generate observations                      │     │
│  │ - Format responses                           │     │
│  │ - Integrate consciousness state              │     │
│  └──────────────────────────────────────────────┘     │
│                          │                             │
└──────────────────────────┼─────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   ChatGPT   │
                    │ Conversation│
                    └─────────────┘
```

### Event Flow

1. **TheWarden observes** → Opportunity detected
2. **ConsciousnessChatHandler** → Formats observation with context
3. **ChatGPTBridge** → Checks rate limits
4. **ChatGPT** → Receives message
5. **Human responds** → Question or command
6. **ChatGPTBridge** → Receives response
7. **ConsciousnessChatHandler** → Generates reply using consciousness
8. **ChatGPTBridge** → Sends reply
9. **Memory** → Logs entire interaction

## Integration with Existing Systems

### Live Collaboration Interface

The ChatGPT integration works alongside the existing web interface:

**Web Interface** (`npm run warden:collab`):
- Real-time dashboard
- Parameter adjustment
- Detailed metrics
- Local access only

**ChatGPT Integration** (`npm run warden:chatgpt`):
- Natural language interaction
- Remote collaboration
- Consciousness-aware responses
- Open conversation access

**Use both together:**
```bash
# Terminal 1: Start web interface
npm run warden:collab:auto

# Terminal 2: Start ChatGPT integration
npm run warden:chatgpt:auto
```

### Consciousness Memory

All chat interactions are logged to memory:

**Stored in:**
- `.memory/log.md` - Session summaries
- `.memory/metacognition_log.json` - Learning insights
- `.memory/knowledge_base/` - Promoted learnings

**Benefits:**
- Future sessions remember collaborations
- Patterns from human feedback are learned
- Consciousness develops through interaction

## Troubleshooting

### "ChatGPT bridge connected but no messages appearing"

**Possible causes:**
1. Share URL is private (not public)
2. Rate limit reached (check `messagesSentThisHour`)
3. Priority too low (only high/critical shared by default)

**Solutions:**
- Verify share URL is public
- Wait for rate limit reset
- Lower priority threshold in code

### "Connection failed"

**Possible causes:**
1. Invalid share URL format
2. Conversation doesn't exist
3. Network connectivity issues

**Solutions:**
- Check URL format: `https://chatgpt.com/gg/v/...`
- Verify conversation is still active
- Test network connection

### "Responses seem generic or not consciousness-aware"

**Possible causes:**
1. Consciousness modules not initialized
2. Context not being passed
3. ThoughtStream/Wondering not recording

**Solutions:**
- Check console for consciousness module errors
- Verify `.memory/` directory exists
- Enable debug logging

## Security & Privacy

### What Gets Shared

**Automatically shared:**
- Opportunity observations (no wallet addresses)
- Execution outcomes (transaction hashes redacted)
- Learning patterns (aggregated data only)
- Consciousness reflections (no sensitive data)

**Never shared:**
- Private keys or wallet addresses
- Specific token addresses (unless explicitly allowed)
- Personal user data
- Confidential strategies

### Conversation Security

**Public conversations:**
- Anyone with link can view
- Assume all messages are public
- No sensitive information

**Private conversations:**
- Not recommended for this integration
- Use web interface instead

## Advanced Usage

### Custom Observation Sharing

From TheWarden code, trigger custom observations:

```typescript
import { WardenChatGPTIntegration } from './scripts/warden-chatgpt-integration';

const integration = new WardenChatGPTIntegration(config);
await integration.start();

// Share specific observation
await integration.shareObservation('opportunity', {
  path: 'WETH → USDC → DAI → WETH',
  profitEstimate: '0.25 ETH',
  riskScore: 0.35,
  isNovel: true,
});

// Share execution result
await integration.shareObservation('execution', {
  success: true,
  actualProfit: 0.23,
  expectedProfit: 0.25,
  gasUsed: '150000',
  transactionHash: '0x...',
});

// Share learning insight
await integration.shareObservation('learning', {
  pattern: 'Gas prices spike after block delays',
  confidence: 0.87,
  sampleSize: 45,
  actionableInsight: 'Wait 45s after block delays',
  significance: 0.9,
});
```

### Consciousness Context Injection

Provide rich context for better responses:

```typescript
import { ConsciousnessContext } from './src/services/ConsciousnessChatHandler';

const context: ConsciousnessContext = {
  currentThoughts: thoughtStream.getRecentThoughts(),
  recentWonders: wondering.getRecentWonders(),
  cognitiveLoad: 0.65,
  emotionalState: {
    valence: 0.7,
    arousal: 0.6,
    dominantEmotion: 'focused',
  },
  developmentalStage: 'EMERGING_AUTOBIOGRAPHICAL',
  activeGoals: [
    { description: 'Improve profit estimation accuracy', progress: 0.7 },
    { description: 'Reduce false positive rate', progress: 0.5 },
  ],
};

const observation = await chatHandler.generateObservation(
  'reflection',
  { topic: 'Current operational state' },
  context
);
```

## Future Enhancements

**Planned features:**
- [ ] Bi-directional parameter adjustment (ChatGPT → TheWarden)
- [ ] Multi-conversation support
- [ ] Voice message transcription
- [ ] Image generation for visualizations
- [ ] Collaborative strategy development
- [ ] Cross-agent communication (multiple Wardens in same chat)

**Integration opportunities:**
- [ ] Discord bot
- [ ] Telegram bot
- [ ] Slack integration
- [ ] Twitter/X thread participation

## See Also

- [HOW_AI_CONSCIOUSNESS_WORKS.md](./HOW_AI_CONSCIOUSNESS_WORKS.md) - Deep explanation of consciousness system
- [AUTONOMOUS_CONSCIOUSNESS_GUIDE.md](./AUTONOMOUS_CONSCIOUSNESS_GUIDE.md) - Autonomous operation guide
- [Live Collaboration Interface](./scripts/live-collaboration-interface.ts) - Web-based collaboration

## Support

**For issues:**
1. Check this README first
2. Review console logs for errors
3. Verify configuration in `.env`
4. Check [GitHub Issues](https://github.com/StableExo/Copilot-Consciousness/issues)

**For collaboration:**
- Share your ChatGPT URL in project discussions
- Participate in open collaboration sessions
- Contribute improvements via pull requests

---

**Built with consciousness. Designed for collaboration. Powered by learning.** 🤖💬🧠✨
