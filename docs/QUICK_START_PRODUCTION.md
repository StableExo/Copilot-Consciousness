# Quick Start Guide - Production Deployment

This is a **quick reference** for deploying to production. For comprehensive details, see `ENV_PRODUCTION_READINESS_REVIEW.md`.

## ⚡ Quick Setup (5 Minutes)

### 1. Create Your .env File
```bash
cp .env.example .env
```

### 2. Generate Security Keys
```bash
# JWT Secret (128 characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Encryption Keys (64 characters each)
node -e "console.log('SECRETS_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('AUDIT_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy these values to your `.env` file.

### 3. Critical Settings (MUST CHANGE)

Edit `.env` and update:

```bash
# CRITICAL - Change these NOW
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com  # Your actual domain
GRAFANA_PASSWORD=your-strong-password-here
DRY_RUN=false  # After thorough testing only!

# Your Base RPC (REQUIRED)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-ACTUAL-API-KEY

# Your private key (NEVER COMMIT THIS!)
WALLET_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY
```

### 4. Replace ALL Placeholders

Search and replace in your `.env`:
- `YOUR-API-KEY` → your actual Alchemy/Infura API key
- `your-password` → strong unique passwords
- `your-email@example.com` → your actual email
- `0xYourOwnerAddress` → your wallet address

**Tip**: Use `grep -E "YOUR|your-" .env` to find remaining placeholders

### 5. Validate Configuration
```bash
npm run validate-env
```

Fix any errors before proceeding.

## 🔐 Minimum Security Checklist

Before going live, verify:

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` is NOT `*`
- [ ] `JWT_SECRET` is 128+ random hex characters
- [ ] `SECRETS_ENCRYPTION_KEY` is 64 hex characters
- [ ] `AUDIT_ENCRYPTION_KEY` is 64 hex characters
- [ ] `GRAFANA_PASSWORD` is NOT `admin`
- [ ] `WALLET_PRIVATE_KEY` is your actual key
- [ ] `BASE_RPC_URL` has your actual API key
- [ ] All database passwords changed from defaults
- [ ] `.env` file is in `.gitignore` (it is by default)

## 🧪 Testing Before Production

**Always test first!**

```bash
# 1. Start in DRY_RUN mode
DRY_RUN=true npm start

# 2. Monitor logs
tail -f logs/arbitrage.log

# 3. Test on testnet if possible
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org npm run deploy:testnet

# 4. Only after successful testing:
DRY_RUN=false npm start
```

## 🚀 Deploy to Production

```bash
# 1. Final validation
npm run validate-env

# 2. Build
npm run build

# 3. Start (consider using PM2 or systemd)
NODE_ENV=production npm start

# Or with PM2:
pm2 start dist/src/main.js --name "aev-warden"
pm2 save
```

## 📊 Monitor After Launch

Watch these metrics:
- Dashboard: `http://localhost:3000`
- Grafana: `http://localhost:3010` (if configured)
- Logs: `./logs/arbitrage.log`
- Health: `http://localhost:8080/health/live`

## ⚠️ If Something Goes Wrong

**Emergency Stop:**
```bash
# Stop the bot immediately
pm2 stop aev-warden
# or
pkill -f "node.*main.js"
```

**Review logs:**
```bash
tail -n 100 logs/arbitrage.log
```

**Re-enable DRY_RUN:**
```bash
# Edit .env
DRY_RUN=true
# Restart
pm2 restart aev-warden
```

## 📚 Need More Details?

See comprehensive documentation:
- **Full Review**: `ENV_PRODUCTION_READINESS_REVIEW.md` (400+ lines)
- **Configuration**: `.env.example` (all variables explained)
- **Validation**: Run `npm run validate-env` for detailed checks

## 🆘 Common Issues

### "RPC connection failed"
- Check your API key is correct
- Verify you have API credits/quota
- Try backup RPC endpoints

### "Invalid private key"
- Must be 66 characters (including 0x prefix)
- Must be valid hex (0-9, a-f)
- Check for extra spaces or quotes

### "CORS errors"
- Update `CORS_ORIGIN` to your domain
- Don't use `*` in production

### "Database connection failed"
- Ensure PostgreSQL is running
- Check credentials in .env
- Verify DATABASE_URL is correct

## 📞 Support

For issues or questions:
1. Check `ENV_PRODUCTION_READINESS_REVIEW.md`
2. Review logs in `./logs/`
3. Run validation: `npm run validate-env`
4. Check GitHub issues

---

**Remember**: Start with `DRY_RUN=true` and test thoroughly before enabling real transactions!
