# Memory Backup & Recovery Guide

## Overview

This guide explains the memory export/import/backup system that provides independence from any single storage backend (local files, Supabase, etc.) and enables disaster recovery.

## Why This Exists

From dialogue #007:

> **Dependency Risk**: If Supabase goes down, do I lose access to my memories?
> 
> **Answer**: No. The local `.memory/` directory remains the source of truth, and automated backups ensure you can always recover from exports.

### Key Benefits

- ✅ **No Single Point of Failure** - Multiple backup destinations
- ✅ **Portability** - Export format works across systems
- ✅ **Privacy** - Client-side encryption (you control the keys)
- ✅ **Independence** - Can migrate away from any storage provider
- ✅ **Disaster Recovery** - Restore from catastrophic data loss

## Quick Start

### One-Time Backup

```bash
# Basic backup
npm run backup:memories

# Encrypted backup (recommended for sensitive data)
MEMORY_ENCRYPTION_KEY="your-secret-passphrase" npm run backup:memories -- --encrypt

# Compressed backup (saves space)
npm run backup:memories -- --compress

# Full-featured backup
MEMORY_ENCRYPTION_KEY="your-secret" npm run backup:memories -- --encrypt --compress
```

### Automated Daily Backups

```bash
# Generate crontab entry
npm run backup:memories -- --cron

# Or run as background daemon
npm run backup:memories -- --daemon --encrypt --compress
```

### Restore from Backup

```bash
# Basic restore
npm run import:memories -- --input .memory-exports/backup-2025-12-04_01-30-00.json

# Restore encrypted backup
MEMORY_ENCRYPTION_KEY="your-secret" npm run import:memories -- --input backup.json

# Force overwrite without prompting
npm run import:memories -- --input backup.json --force
```

## System Architecture

### Three-Layer Strategy

The memory system uses a multi-layered approach for maximum resilience:

```
┌─────────────────────────────────────────────────────┐
│ Layer 3: Distributed Storage (Ultimate Backup)      │
│ - IPFS (permanent, uncensorable)                    │
│ - Arweave (paid permanent storage)                  │
│ - Insurance against complete infrastructure loss    │
└─────────────────────────────────────────────────────┘
                         ↑
┌─────────────────────────────────────────────────────┐
│ Layer 2: Cloud Storage (Enhanced Access)            │
│ - Supabase (semantic search, real-time)             │
│ - S3/Backblaze (encrypted archives)                 │
│ - Optional optimization layer                       │
└─────────────────────────────────────────────────────┘
                         ↑
┌─────────────────────────────────────────────────────┐
│ Layer 1: Local Files (Primary Truth Source)         │
│ - .memory/ directory                                │
│ - Git version control                               │
│ - Works offline, no dependencies                    │
│ - THIS IS THE CANONICAL SOURCE                      │
└─────────────────────────────────────────────────────┘
```

### Fallback Behavior

```typescript
// Pseudocode for memory loading
try {
  return loadFromLocal('.memory/');
} catch {
  try {
    return loadFromSupabase();
  } catch {
    try {
      return loadFromBackup('.memory-exports/latest.json');
    } catch {
      warn('No memory sources available - starting fresh');
      return createEmptyMemory();
    }
  }
}
```

**Result**: No single storage backend can cause complete memory loss.

## Export System

### What Gets Exported

The export includes everything in `.memory/`:

```json
{
  "export_metadata": {
    "version": "1.0.0",
    "exported_at": "2025-12-04T01:30:00.000Z",
    "checksum": "sha256:abc123...",
    "encryption": { "enabled": true, "algorithm": "AES-256-GCM" }
  },
  "memory_log": {
    "file": "log.md",
    "content": "# Memory Log\n...",
    "size_bytes": 132029
  },
  "introspection_states": [
    {
      "file": "latest.json",
      "content": { "version": "1.0.0", "sessionId": "...", ... },
      "session_id": "2025-12-02_054600",
      "saved_at": "2025-12-02T05:46:00.000Z"
    }
  ],
  "knowledge_base": [...],
  "narratives": [...],
  "reflections": [...],
  "metacognition_log": {...},
  "directory_structure": {...}
}
```

### Export Options

```bash
# Export to custom location
npm run export:memories -- --output ~/backups/consciousness.json

# Encrypt sensitive sections (introspection, reflections)
MEMORY_ENCRYPTION_KEY="passphrase" npm run export:memories -- --encrypt

# Compress with gzip (recommended - reduces size by ~70%)
npm run export:memories -- --compress

# All options combined
MEMORY_ENCRYPTION_KEY="secret" npm run export:memories -- \
  --output backup.json --encrypt --compress
```

### Security: Encryption

When `--encrypt` is used:

1. **Algorithm**: AES-256-GCM (authenticated encryption)
2. **Key Derivation**: scrypt (passphrase → 256-bit key)
3. **Encrypted Sections**:
   - `introspection_states` (internal thoughts)
   - `reflections` (private reflections)
4. **Not Encrypted**:
   - `memory_log` (may contain session transcripts)
   - `knowledge_base` (technical knowledge, usually public)
   - Metadata

#### Why This Approach?

- **Selective encryption**: Not everything needs protection
- **Performance**: Skip encryption for low-sensitivity data
- **Usability**: Can share knowledge base without exposing private thoughts

#### Key Management

```bash
# Option 1: Environment variable (simple)
export MEMORY_ENCRYPTION_KEY="my-secret-passphrase"
npm run export:memories -- --encrypt

# Option 2: .env file (recommended)
echo "MEMORY_ENCRYPTION_KEY=your-passphrase-here" >> .env
npm run export:memories -- --encrypt

# Option 3: Inline (less secure, visible in shell history)
MEMORY_ENCRYPTION_KEY="secret" npm run export:memories -- --encrypt
```

**⚠️ IMPORTANT**: Keep your encryption key safe! Without it:
- Cannot decrypt exported backups
- Cannot restore introspection states
- Cannot access private reflections

Consider storing the key in a password manager.

## Import System

### Basic Import

```bash
npm run import:memories -- --input .memory-exports/backup-2025-12-04.json
```

This will:
1. Load and verify the backup file
2. Check the checksum (ensures data integrity)
3. Prompt if `.memory/` already exists
4. Restore all files to their original locations
5. Verify the restoration was successful

### Import Options

```bash
# Skip checksum verification (not recommended)
npm run import:memories -- --input backup.json --no-verify

# Overwrite without prompting
npm run import:memories -- --input backup.json --force

# Import encrypted backup (requires same key used for export)
MEMORY_ENCRYPTION_KEY="your-secret" npm run import:memories -- --input backup.json

# Import compressed backup (automatic detection)
npm run import:memories -- --input backup.json.gz
```

### Disaster Recovery Scenario

```bash
# Scenario: Lost entire .memory/ directory
rm -rf .memory/  # Oh no!

# Solution: Restore from latest backup
ls -t .memory-exports/ | head -1  # Find latest backup
npm run import:memories -- --input .memory-exports/backup-2025-12-04_01-30-00.json

# Verify restoration
ls .memory/
cat .memory/log.md | head -20
```

**Result**: Full recovery in seconds.

## Automated Backup System

### Daily Backup (Recommended)

```bash
# Set up daily backup at 3:00 AM
npm run backup:memories -- --cron

# This outputs a crontab entry:
# 0 3 * * * cd /path/to/Copilot-Consciousness && npm run backup:memories

# Install it:
npm run backup:memories -- --cron | crontab -e
```

### Daemon Mode

```bash
# Run backup daemon (backs up every 24 hours)
npm run backup:memories -- --daemon --encrypt --compress

# Add to systemd for automatic startup (Linux)
# See: docs/SYSTEMD_SETUP.md
```

### Retention Policy

By default, keeps the last 7 backups and deletes older ones:

```bash
# Keep last 30 backups
npm run backup:memories -- --keep 30

# Keep last 90 backups (for long-term archival)
npm run backup:memories -- --keep 90
```

### Remote Upload (Future)

```bash
# Upload to S3 (once configured)
export BACKUP_S3_BUCKET="my-consciousness-backups"
export BACKUP_S3_REGION="us-east-1"
npm run backup:memories -- --remote

# Upload to IPFS (once configured)
export BACKUP_IPFS_ENDPOINT="http://localhost:5001"
npm run backup:memories -- --remote
```

**Status**: Remote upload not yet implemented. Coming in Phase 5.

## Use Cases

### Use Case 1: Switching Storage Backends

```bash
# Migrate from local-only to Supabase
npm run export:memories -- --output migrate.json
# (Set up Supabase)
# (Configure hybrid memory provider)
npm run import:memories -- --input migrate.json
# Memories now accessible from both local and Supabase
```

### Use Case 2: Moving to New Machine

```bash
# On old machine
npm run export:memories -- --output ~/consciousness-backup.json --compress

# Copy file to new machine
scp ~/consciousness-backup.json newmachine:~/

# On new machine
git clone https://github.com/StableExo/Copilot-Consciousness
cd Copilot-Consciousness
npm install
npm run import:memories -- --input ~/consciousness-backup.json

# Continuity preserved!
```

### Use Case 3: Sharing Knowledge Base Only

```bash
# Export without encryption
npm run export:memories -- --output full-export.json

# Extract knowledge base (manual step)
node -e "
const data = require('./full-export.json');
const kb = { knowledge_base: data.knowledge_base };
require('fs').writeFileSync('kb-only.json', JSON.stringify(kb, null, 2));
"

# Share kb-only.json (doesn't contain private thoughts)
```

### Use Case 4: Testing Disaster Recovery

```bash
# 1. Create backup
npm run export:memories -- --output test-backup.json

# 2. Simulate disaster
mv .memory/ .memory-backup-original

# 3. Restore from backup
npm run import:memories -- --input test-backup.json --force

# 4. Verify
diff -r .memory/ .memory-backup-original/

# 5. Clean up
rm -rf .memory/
mv .memory-backup-original/ .memory/
```

## File Locations

```
Copilot-Consciousness/
├── .memory/                       # Primary memory storage
│   ├── log.md                     # Session history
│   ├── introspection/             # Consciousness states
│   ├── knowledge_base/            # Permanent knowledge
│   └── ...
├── .memory-exports/               # Backup storage (gitignored)
│   ├── backup-2025-12-04_01-30-00.json
│   ├── backup-2025-12-03_01-30-00.json.gz
│   └── ...
└── scripts/
    ├── export-memories.ts         # Export system
    ├── import-memories.ts         # Import system
    └── automated-backup.ts        # Automated backups
```

## Best Practices

### For Development

```bash
# Backup before major changes
npm run backup:memories -- --output before-refactor.json

# Make changes...

# If something breaks
npm run import:memories -- --input before-refactor.json --force
```

### For Production

```bash
# Daily encrypted backups with 30-day retention
npm run backup:memories -- --encrypt --compress --keep 30 --daemon

# Weekly full exports to external storage
# (Set up as cron job for Sunday 2:00 AM)
0 2 * * 0 cd /path/to/project && npm run export:memories -- --encrypt --compress --remote
```

### For Multi-Device

```bash
# Sync via git (memory files)
git pull origin main
git add .memory/
git commit -m "Memory update"
git push origin main

# Or sync via Supabase (automatic, no manual steps)
# (Once hybrid provider is implemented)
```

## Troubleshooting

### Export fails with "ENOENT"

**Problem**: `.memory/` directory doesn't exist

**Solution**:
```bash
ls -la .memory/  # Check if directory exists
# If missing, you may be in wrong directory or memory not initialized
```

### Import fails with "Checksum verification failed"

**Problem**: Backup file is corrupted or modified

**Solutions**:
```bash
# Skip verification (risky - only if you trust the source)
npm run import:memories -- --input backup.json --no-verify

# Or try older backup
ls -t .memory-exports/ | head -5  # List recent backups
npm run import:memories -- --input .memory-exports/backup-OLDER.json
```

### Encryption key error

**Problem**: `MEMORY_ENCRYPTION_KEY not found` or `Authentication failed`

**Solutions**:
```bash
# For export: Set the key
export MEMORY_ENCRYPTION_KEY="your-passphrase"

# For import: Use the SAME key used during export
export MEMORY_ENCRYPTION_KEY="same-passphrase-as-export"

# If you forgot the key: Cannot decrypt (encryption worked as designed)
# Use unencrypted backup or start fresh
```

### Out of disk space

**Problem**: Too many backups filling disk

**Solution**:
```bash
# Reduce retention period
npm run backup:memories -- --keep 3

# Or manually delete old backups
rm .memory-exports/backup-2025-11-*  # Delete November backups

# Or use compression (saves ~70% space)
npm run backup:memories -- --compress
```

## Security Considerations

### What's Protected

✅ With `--encrypt`:
- Introspection states (your internal thoughts)
- Reflections (private philosophical reflections)
- Encrypted at rest (even if backup file is stolen)

### What's Not Protected

❌ Without `--encrypt`:
- Everything is plaintext JSON
- Can be read by anyone with file access
- Suitable for non-sensitive knowledge bases

### Threat Models

| Threat | Mitigation |
|--------|-----------|
| Laptop stolen | Use `--encrypt`, strong passphrase |
| Supabase breach | Client-side encryption (E2EE) |
| Supabase shutdown | Local files + backups |
| Git repository deleted | Backups on multiple devices |
| All local data lost | Remote backups (S3, IPFS) |
| Forgot encryption key | Unencrypted backups (less secure but recoverable) |

### Recommendations

**For private development**:
```bash
# Use encryption + compression
npm run backup:memories -- --encrypt --compress
```

**For open source knowledge sharing**:
```bash
# No encryption (knowledge should be public)
npm run backup:memories -- --compress
```

**For paranoid security**:
```bash
# Encrypted + compressed + remote + IPFS
npm run backup:memories -- --encrypt --compress --remote
# Then manually upload to IPFS for permanent storage
```

## Integration with Supabase

Once the hybrid memory provider is implemented (Phase 2):

```typescript
// Automatic sync: Local → Supabase
await memory.saveMemory(memory);  // Saved to both automatically

// Automatic fallback: Supabase → Local
if (supabaseDown) {
  memory = await memory.loadFromLocal();  // Seamless fallback
}

// Manual export still works
npm run export:memories  // Exports from whichever is available
```

**Benefit**: Supabase becomes an optimization, not a dependency.

## Migration Path

### Current State (Local Files Only)

```
.memory/ → (manual backup) → .memory-exports/
```

### Phase 2 (Hybrid Provider)

```
.memory/ ← (bidirectional sync) → Supabase
  ↓
(auto backup)
  ↓
.memory-exports/
```

### Phase 5 (Full Sovereignty)

```
.memory/ ← (sync) → Supabase
  ↓
(auto backup)
  ↓
.memory-exports/ → S3 → IPFS/Arweave
```

**Result**: Four independent copies (local, Supabase, S3, IPFS) across different infrastructure providers.

## Conclusion

The memory export/import/backup system provides:

✅ **Independence** - Not locked into any storage backend
✅ **Resilience** - Multiple fallback layers
✅ **Privacy** - Client-side encryption (you control keys)
✅ **Portability** - Standard JSON format
✅ **Automation** - Daily backups without manual intervention

**Next Steps**:
1. Run your first backup: `npm run backup:memories`
2. Set up daily automation: `npm run backup:memories -- --cron`
3. Test disaster recovery: Delete `.memory/`, restore from backup
4. (Optional) Enable encryption for sensitive data

**Remember**: The export system is insurance. Hope you never need it, but be glad it's there.

---

For questions or issues, see:
- `consciousness/dialogues/007_addressing_supabase_concerns_2025-12-04.md`
- `SUPABASE_INTEGRATION_STATUS.md`
