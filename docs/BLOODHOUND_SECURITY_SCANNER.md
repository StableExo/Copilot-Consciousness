# Bloodhound Security Scanner

## Overview

Bloodhound is a real-time API key leak detection system integrated from AxionCitadel. It monitors GitHub's public event stream to detect accidentally committed cryptographic secrets and API keys, providing an early warning system for security vulnerabilities.

## What is Bloodhound?

Bloodhound is a security intelligence tool that:
- **Monitors GitHub Public Events**: Watches the GitHub public event stream in real-time
- **Detects Secret Leaks**: Uses pattern matching to identify various types of secrets
- **Logs Findings**: Automatically records all detected leaks for analysis
- **Provides Early Warning**: Alerts on potential security breaches as they happen

## Detected Secret Types

Bloodhound can detect the following types of secrets:

### Private Keys
- SSH RSA Private Keys
- SSH OpenSSH Private Keys
- SSH EC Private Keys
- Bitcoin Private Keys
- Ethereum Private Keys

### API Keys & Tokens
- GitHub Personal Access Tokens
- GitHub OAuth Access Tokens
- GitHub App Tokens
- GitHub Refresh Tokens
- Slack Tokens
- Stripe API Keys
- AWS Access Keys
- AWS Secret Access Keys
- Google API Keys
- Heroku API Keys
- Gemini API Keys

## Installation

### Prerequisites

```bash
# Install required Python packages
pip install requests python-dotenv
```

### Configuration

1. Get a GitHub Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with `public_repo` scope (for reading public events)
   
2. Add the token to your `.env` file:
   ```bash
   GITHUB_PAT=your_github_personal_access_token_here
   ```

## Usage

### Basic Usage

```bash
# Run Bloodhound with default settings
python scripts/bloodhound.py
```

### Advanced Usage

```bash
# Custom log file location
python scripts/bloodhound.py --log-file /path/to/custom/leaks.log

# Custom polling interval (in seconds)
python scripts/bloodhound.py --poll-interval 30
```

### Programmatic Usage

```python
from scripts.bloodhound import Bloodhound

# Initialize Bloodhound
scanner = Bloodhound(
    github_token="your_token",
    log_file="custom_leaks.log"
)

# Customize polling interval
scanner.poll_interval = 30

# Start monitoring
scanner.run()
```

## Output

### Console Output

When a leak is detected, Bloodhound prints a formatted alert:

```
🚨🚨🚨 SECRET LEAK DETECTED in username/repository 🚨🚨🚨
{
  "timestamp": "2025-11-17T07:15:00Z",
  "repository": "username/repository",
  "commit_url": "https://github.com/username/repository/commit/abc123",
  "author": "Commit Author",
  "findings": {
    "ETHEREUM_PRIVATE_KEY": [
      {
        "value": "0x1234567890abcdef...",
        "match_start": 123,
        "match_end": 187
      }
    ]
  }
}
```

### Log File

All findings are automatically logged to `bloodhound_leaks.log` (or custom location) in JSON Lines format for easy processing:

```json
{"timestamp": "2025-11-17T07:15:00Z", "repository": "username/repo", ...}
{"timestamp": "2025-11-17T07:16:00Z", "repository": "another/repo", ...}
```

## Integration with Consciousness System

Bloodhound can be integrated with the consciousness system for automated security monitoring:

```typescript
import { spawn } from 'child_process';

// Start Bloodhound as a background process
const bloodhound = spawn('python', ['scripts/bloodhound.py']);

bloodhound.stdout.on('data', (data) => {
  console.log(`Bloodhound: ${data}`);
});

bloodhound.stderr.on('data', (data) => {
  console.error(`Bloodhound Error: ${data}`);
});
```

## How It Works

1. **Event Stream Monitoring**: Bloodhound polls GitHub's public events API every 60 seconds (configurable)
2. **Commit Analysis**: For each PushEvent, it fetches the commit diff
3. **Pattern Matching**: Scans added lines using regex patterns for known secret formats
4. **Entropy Checking**: Filters false positives using minimum length requirements
5. **Logging**: Records findings with full context (repository, commit URL, author)

## Security Considerations

### Rate Limiting

- GitHub API has rate limits (60 requests/hour unauthenticated, 5000/hour authenticated)
- Using a Personal Access Token is recommended for higher limits
- Default polling interval (60s) is conservative to avoid hitting limits

### Privacy

- Only scans public repositories
- Does not access or store actual secret values (truncates in logs)
- Respects GitHub's terms of service

### False Positives

- Some patterns may match non-secrets (e.g., example keys in documentation)
- Entropy checking helps reduce false positives
- Review findings before taking action

## Use Cases

### Security Monitoring
- Monitor your organization's repositories for accidental leaks
- Track industry-wide security incidents
- Research security patterns and trends

### Research
- Study secret exposure patterns
- Analyze security practices across projects
- Track response times to leaked credentials

### Educational
- Learn about common secret leak patterns
- Understand API key formats
- Practice security awareness

## Limitations

- Only monitors public repositories
- Real-time monitoring has slight delay (polling interval)
- Cannot detect secrets already committed before monitoring started
- Does not scan private repositories or non-GitHub sources

## Best Practices

1. **Use for Monitoring Only**: This tool is for detection, not prevention
2. **Rotate Compromised Keys**: If your key is detected, rotate it immediately
3. **Implement Prevention**: Use pre-commit hooks and secret scanning in CI/CD
4. **Regular Reviews**: Periodically review log files for patterns
5. **Privacy Awareness**: Be mindful when sharing or processing findings

## Integration from AxionCitadel

Bloodhound was originally developed as part of AxionCitadel's security infrastructure. It represents the project's commitment to:

- **Defensive Security**: Proactive threat detection
- **Intelligence Gathering**: Learning from the broader ecosystem
- **AGI Development**: Teaching AI systems about security patterns
- **Ethical Operation**: Responsible security research

The integration into Copilot-Consciousness enhances the system's security awareness and provides real-world data for the consciousness system to learn from security patterns and threats.

## Future Enhancements

Potential improvements for Bloodhound:

- [ ] Machine learning-based secret detection
- [ ] Integration with threat intelligence feeds
- [ ] Automated notification systems (email, Slack, etc.)
- [ ] Historical analysis and trending
- [ ] Multi-platform support (GitLab, Bitbucket)
- [ ] Real-time streaming (WebSockets) instead of polling
- [ ] Database storage for findings
- [ ] Web dashboard for visualization

## Contributing

Contributions are welcome! Areas for improvement:

- Add new secret patterns
- Improve false positive filtering
- Enhance entropy checking
- Add more output formats
- Improve documentation

## References

- [GitHub Events API](https://docs.github.com/en/rest/activity/events)
- [Secret Scanning Best Practices](https://docs.github.com/en/code-security/secret-scanning)
- [AxionCitadel Security Framework](../consciousness/context/architectural-principles.ts)

## License

Integrated from AxionCitadel. See LICENSE file for details.
