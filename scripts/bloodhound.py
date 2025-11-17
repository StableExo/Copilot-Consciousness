"""
Bloodhound - API Key Leak Detection System

Integrated from AxionCitadel's bloodhound.py
Monitors GitHub public events for potential secret leaks in commits.

This security tool scans GitHub's public event stream to detect
accidentally committed cryptographic secrets and API keys in real-time.

Features:
- Real-time monitoring of GitHub public events
- Pattern matching for various secret types
- Automatic logging of findings
- Low-latency detection system

Usage:
    python scripts/bloodhound.py

Requirements:
    - GITHUB_PAT environment variable set
    - requests library
"""

import requests
import json
import time
import re
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Crypto secret patterns for detection
CRYPTO_SECRET_PATTERNS = {
    'SSH_RSA_PRIVATE_KEY': r'-----BEGIN RSA PRIVATE KEY-----[^-]*-----END RSA PRIVATE KEY-----',
    'SSH_OPENSSH_PRIVATE_KEY': r'-----BEGIN OPENSSH PRIVATE KEY-----[^-]*-----END OPENSSH PRIVATE KEY-----',
    'SSH_EC_PRIVATE_KEY': r'-----BEGIN EC PRIVATE KEY-----[^-]*-----END EC PRIVATE KEY-----',
    'GITHUB_PERSONAL_ACCESS_TOKEN': r'ghp_[a-zA-Z0-9]{36}',
    'GITHUB_OAUTH_ACCESS_TOKEN': r'gho_[a-zA-Z0-9]{36}',
    'GITHUB_APP_TOKEN': r'ghu_[a-zA-Z0-9]{36}',
    'GITHUB_REFRESH_TOKEN': r'ghr_[a-zA-Z0-9]{76}',
    'SLACK_TOKEN': r'xox[pborsa]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}',
    'STRIPE_API_KEY': r'sk_live_[0-9a-zA-Z]{24}',
    'AWS_ACCESS_KEY_ID': r'AKIA[0-9A-Z]{16}',
    'AWS_SECRET_ACCESS_KEY': r'[0-9a-zA-Z/+]{40}',
    'GOOGLE_API_KEY': r'AIza[0-9A-Za-z\\-_]{35}',
    'HEROKU_API_KEY': r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    'BITCOIN_PRIVATE_KEY': r'5[HJK][1-9A-Za-z][^OIl]{48}',
    'ETHEREUM_PRIVATE_KEY': r'0x[0-9a-fA-F]{64}',
    'GEMINI_API_KEY': r'(gemini|GEMINI)[_-]?(api[_-]?key|API[_-]?KEY)["\']?\s*[:=]\s*["\']?[a-zA-Z0-9-_]{30,}',
}


def detect_crypto_secrets(code_block: str) -> Dict[str, List[Dict]]:
    """
    Scans a block of text for cryptographic secrets and API keys.
    
    Args:
        code_block: A string containing the code or text to be scanned
        
    Returns:
        A dictionary with secret types as keys and a list of found secrets as values
    """
    findings = {}
    
    for secret_type, pattern in CRYPTO_SECRET_PATTERNS.items():
        # Using re.DOTALL to make '.' match newlines for multi-line keys
        matches = re.finditer(pattern, code_block, re.IGNORECASE | re.DOTALL)
        
        for match in matches:
            # Get the secret value
            secret_value = match.group(1) if match.lastindex and len(match.groups()) > 0 else match.group(0)
            
            # Basic entropy check to filter out false positives
            if len(secret_value) < 12:  # Arbitrary minimum length
                continue
            
            if secret_type not in findings:
                findings[secret_type] = []
            
            findings[secret_type].append({
                "value": secret_value[:20] + "..." if len(secret_value) > 20 else secret_value,  # Truncate for logging
                "match_start": match.start(),
                "match_end": match.end()
            })
    
    return findings


class Bloodhound:
    """GitHub API Key Leak Detection System"""
    
    def __init__(self, github_token: Optional[str] = None, log_file: str = "bloodhound_leaks.log"):
        """
        Initialize the Bloodhound scanner
        
        Args:
            github_token: GitHub Personal Access Token (or use GITHUB_PAT env var)
            log_file: Path to log file for findings
        """
        self.github_token = github_token or os.getenv("GITHUB_PAT")
        if not self.github_token:
            raise ValueError("🔴 CRITICAL: GITHUB_PAT not found in environment. Set it in .env file or pass as argument.")
        
        self.events_url = "https://api.github.com/events"
        self.headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        self.log_file = log_file
        self.poll_interval = 60  # seconds
        self.last_event_id = None
        self.total_events_processed = 0
        
        # Ensure log directory exists
        Path(self.log_file).parent.mkdir(parents=True, exist_ok=True)
    
    def get_commit_diff(self, commit_url: str) -> str:
        """
        Fetches the diff of a commit
        
        Args:
            commit_url: URL of the commit
            
        Returns:
            Diff content as string
        """
        # Transform to API URL for diff
        api_url = commit_url.replace("github.com", "api.github.com/repos")
        
        try:
            diff_response = requests.get(
                api_url,
                headers=dict(self.headers, Accept='application/vnd.github.v3.diff'),
                timeout=10
            )
            diff_response.raise_for_status()
            return diff_response.text
        except Exception as e:
            # Silent failure for individual commits
            return ""
    
    def process_event(self, event: Dict) -> None:
        """
        Processes a single GitHub PushEvent
        
        Args:
            event: GitHub event dictionary
        """
        if event['type'] != 'PushEvent':
            return
        
        repo_name = event['repo']['name']
        
        for commit in event['payload'].get('commits', []):
            if not commit.get('distinct'):
                continue
            
            try:
                diff_text = self.get_commit_diff(commit['url'])
                if not diff_text:
                    continue
                
                # Extract only added lines
                added_lines = [
                    line[1:] for line in diff_text.split('\n')
                    if line.startswith('+') and not line.startswith('+++')
                ]
                code_block = "\n".join(added_lines)
                
                # Scan for secrets
                findings = detect_crypto_secrets(code_block)
                
                if findings:
                    log_entry = {
                        "timestamp": event['created_at'],
                        "repository": repo_name,
                        "commit_url": commit['url'].replace("api.github.com/repos", "github.com").replace("/commits/", "/commit/"),
                        "author": commit['author']['name'],
                        "findings": findings
                    }
                    
                    print(f"\n🚨🚨🚨 SECRET LEAK DETECTED in {repo_name} 🚨🚨🚨")
                    print(json.dumps(log_entry, indent=2))
                    
                    # Log to file
                    with open(self.log_file, 'a') as f:
                        f.write(json.dumps(log_entry) + "\n")
                        
            except Exception:
                # Silent failure for individual commits
                pass
    
    def run(self) -> None:
        """Main monitoring loop"""
        spinner_chars = ['|', '/', '-', '\\']
        spinner_index = 0
        
        print("🔥 Bloodhound API Key Scanner Initialized")
        print(f"📝 Logging findings to: {self.log_file}")
        print("🎯 Listening to GitHub public event stream...\n")
        
        try:
            while True:
                try:
                    response = requests.get(
                        self.events_url,
                        headers=self.headers,
                        timeout=10
                    )
                    response.raise_for_status()
                    events = response.json()
                    
                    new_events_count = 0
                    if events:
                        for event in reversed(events):
                            # Check if event is new
                            if self.last_event_id is None or int(event['id']) > int(self.last_event_id):
                                new_events_count += 1
                                self.process_event(event)
                        
                        # Update last seen event ID
                        self.last_event_id = events[0]['id']
                    
                    self.total_events_processed += new_events_count
                    
                    # Heartbeat status
                    status_text = f" {spinner_chars[spinner_index]} Monitoring... | Total Events: {self.total_events_processed} | New: {new_events_count}"
                    sys.stdout.write(status_text + ' ' * (80 - len(status_text)) + '\r')
                    sys.stdout.flush()
                    spinner_index = (spinner_index + 1) % len(spinner_chars)
                    
                except requests.exceptions.RequestException as e:
                    sys.stdout.write(" " * 80 + "\r")
                    print(f"\n[NETWORK ERROR] {e}. Retrying in {self.poll_interval}s...")
                except Exception as e:
                    sys.stdout.write(" " * 80 + "\r")
                    print(f"\n[UNEXPECTED ERROR] {e}")
                
                time.sleep(self.poll_interval)
                
        except KeyboardInterrupt:
            print("\n✅ Bloodhound shutdown initiated by user. Exiting.")
            sys.exit(0)


def main():
    """CLI interface for Bloodhound"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Bloodhound - GitHub API Key Leak Detection System"
    )
    parser.add_argument(
        "--log-file",
        default="bloodhound_leaks.log",
        help="Path to log file for findings"
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=60,
        help="Polling interval in seconds"
    )
    
    args = parser.parse_args()
    
    # Initialize and run
    bloodhound = Bloodhound(log_file=args.log_file)
    bloodhound.poll_interval = args.poll_interval
    bloodhound.run()


if __name__ == "__main__":
    main()
