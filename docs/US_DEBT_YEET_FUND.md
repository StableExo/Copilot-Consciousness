# US Debt-Yeet Fund: Complete Treasury Purchase Guide

**Last Updated:** 2025-11-27

This document provides a complete, step-by-step guide for allocating 70% of profits to US Treasury instruments.

---

## Quick Summary

| Step | Action | Where | Time |
|------|--------|-------|------|
| 1 | Profits accumulate | On-chain staging wallet | Automatic |
| 2 | Convert to USD | Coinbase/Kraken | 1-2 days |
| 3 | Transfer to bank | Your US bank account | 1-3 days |
| 4 | Buy T-Bills | TreasuryDirect.gov | Same day |

**Total time from crypto to T-Bills: 3-7 business days**

---

## What Is This?

Per [LEGAL_POSITION.md](../LEGAL_POSITION.md), 70% of net realized profits are allocated to purchasing US Treasury instruments to help service US sovereign debt.

**Important**: This is NOT a direct on-chain transfer to the US Treasury Department. Cryptocurrency cannot be sent directly to the US government. Instead, the flow is:

```
Crypto Profits → Staging Wallet → Off-Ramp to USD → TreasuryDirect.gov → Buy T-Bills/Bonds
```

---

## Step 1: Set Up Your Accounts (One-Time Setup)

### A. Create TreasuryDirect Account

**Website**: [TreasuryDirect.gov](https://www.treasurydirect.gov/)

1. Go to **[TreasuryDirect.gov](https://www.treasurydirect.gov/)**
2. Click **"Open an Account"** (top right)
3. Select **"Individual"** account type
4. Required information:
   - Social Security Number (SSN)
   - US Bank account (checking or savings)
   - Email address
   - Physical US address
5. Create your password and security questions
6. **SAVE your Account Number** (format: `X-XXX-XXX-XXX`)

> ⚠️ **Important**: TreasuryDirect has strict security. If you forget your password, recovery requires mailing physical documents. Keep your credentials safe!

### B. Set Up Verified Exchange Account

Choose one (or both for redundancy):

**Option 1: Coinbase**
1. Go to [Coinbase.com](https://www.coinbase.com/)
2. Create account with email
3. Complete identity verification:
   - Upload government ID (driver's license or passport)
   - Take a selfie
4. Link your US bank account (for USD withdrawal)
5. Enable 2FA (use authenticator app, not SMS)
6. Get your **deposit address** for ETH/tokens

**Option 2: Kraken**
1. Go to [Kraken.com](https://www.kraken.com/)
2. Create account
3. Complete **Intermediate** or **Pro** verification
4. Link your US bank account
5. Enable 2FA
6. Get your **deposit address**

---

## Step 2: Configure Your Staging Wallet

Add to your `.env` file:

```bash
# ===========================================
# US DEBT-YEET FUND CONFIGURATION
# ===========================================

# Your staging wallet address (70% of profits go here)
TREASURY_STAGING_ADDRESS=0xYourStagingWalletHere

# Your exchange deposit address (from Coinbase/Kraken)
EXCHANGE_DEPOSIT_ADDRESS=0xYourExchangeDepositAddress

# Minimum amount before triggering off-ramp (in ETH)
TREASURY_OFFRAMP_THRESHOLD_ETH=5

# Allocation percentages (must sum to 100)
TREASURY_ALLOCATION_PERCENT=70
OPERATIONS_ALLOCATION_PERCENT=20
RESERVE_ALLOCATION_PERCENT=10
```

---

## Step 3: The Off-Ramp Process (Crypto → USD)

When your staging wallet reaches the threshold, follow these steps:

### A. Transfer Crypto to Exchange

Send ETH/tokens from your staging wallet to your exchange deposit address:

```bash
# Using cast (foundry)
cast send $EXCHANGE_DEPOSIT_ADDRESS \
  --value 5ether \
  --private-key $STAGING_WALLET_PRIVATE_KEY \
  --rpc-url $RPC_URL
```

Or use your wallet interface (MetaMask, etc.)

### B. Sell Crypto for USD

**On Coinbase:**
1. Wait for deposit to confirm (usually 10-20 minutes)
2. Go to **Trade** → **Sell**
3. Select ETH (or your token)
4. Enter amount to sell
5. Select **USD** as output
6. Click **Sell**
7. Go to **Assets** → **USD** → **Withdraw**
8. Select your linked bank account
9. Enter amount and confirm

**On Kraken:**
1. Wait for deposit to confirm
2. Go to **Trade** → **New Order**
3. Select pair (e.g., ETH/USD)
4. Order type: **Market** (for immediate sale)
5. Enter amount and submit
6. Go to **Funding** → **Withdraw**
7. Select **USD** and your bank
8. Enter amount and confirm

### C. Wait for Bank Settlement

- **Coinbase ACH**: 1-3 business days
- **Kraken ACH**: 1-5 business days  
- **Wire transfer**: Same day (but higher fees, ~$25)

---

## Step 4: Buy Treasury Securities

Once USD is in your bank account:

### Option A: Buy T-Bills (Recommended)

T-Bills are short-term, low-risk, and easy to reinvest.

1. Log into **[TreasuryDirect.gov](https://www.treasurydirect.gov/)**
2. Click **"BuyDirect"** in the menu
3. Select **"Bills"**
4. Choose your term:

| Term | Auction Frequency | Best For |
|------|-------------------|----------|
| 4-week | Weekly (Tuesday) | Maximum liquidity |
| 8-week | Weekly (Tuesday) | Short-term |
| 13-week | Weekly (Monday) | Balanced |
| 17-week | Every 4 weeks | Slightly longer |
| 26-week | Weekly (Monday) | Higher yield |
| 52-week | Every 4 weeks | Highest short-term yield |

5. Enter purchase amount (minimum **$100**)
6. Select your linked bank account
7. Review details and **Submit**
8. **Save the confirmation number and CUSIP**

### Option B: Buy I-Bonds (Inflation Protected)

Great for inflation hedging, but limited to $10,000/year.

1. Log into TreasuryDirect
2. Click **"BuyDirect"**
3. Select **"I Bonds"** under Savings Bonds
4. Enter amount ($25 minimum, $10,000 maximum per year)
5. Submit purchase
6. Bonds appear in your account immediately

### Option C: Buy T-Notes or T-Bonds (Longer Term)

For longer-term holdings with semi-annual interest payments.

1. Log into TreasuryDirect
2. Click **"BuyDirect"**
3. Select **"Notes"** or **"Bonds"**
4. Choose term (2, 3, 5, 7, 10, 20, or 30 years)
5. Enter amount and submit

---

## Step 5: Record Your Purchase (Proof)

After each purchase, save this information:

```json
{
  "purchase_date": "2025-11-27",
  "security_type": "T-Bill",
  "term": "13-week",
  "amount_usd": 10000.00,
  "cusip": "912797XX1",
  "confirmation_number": "XXXXXXXXX",
  "maturity_date": "2026-02-27",
  "yield_at_purchase": "5.15%",
  "source_crypto": "ETH",
  "source_amount": "5.5",
  "source_tx_hash": "0xabc123...",
  "exchange_used": "Coinbase",
  "notes": "Q4 2025 allocation"
}
```

Keep these records for:
- Tax purposes (1099-INT reporting)
- Transparency/audit trail
- Tracking your total contributions

---

## Treasury Securities Quick Reference

| Type | Term | Min | Interest | When to Use |
|------|------|-----|----------|-------------|
| **T-Bill** | 4-52 weeks | $100 | Discount at maturity | Regular purchases |
| **T-Note** | 2-10 years | $100 | Semi-annual | Medium-term savings |
| **T-Bond** | 20-30 years | $100 | Semi-annual | Long-term holdings |
| **I-Bond** | 30 years | $25 | Inflation-adjusted | Inflation hedge |
| **EE-Bond** | 30 years | $25 | Fixed (doubles in 20yr) | Guaranteed return |

---

## Current Rates (Late 2024/2025)

Check live rates at: [TreasuryDirect.gov/auctions](https://www.treasurydirect.gov/auctions/)

Approximate rates as of late 2024:
- 4-week T-Bill: ~5.25% APY
- 13-week T-Bill: ~5.20% APY
- 26-week T-Bill: ~5.05% APY
- 52-week T-Bill: ~4.75% APY
- I-Bond: ~5.27% composite rate

---

## Automation Tips

### Set Up Auto-Reinvestment

When T-Bills mature, they can automatically reinvest:

1. When buying: Check **"Schedule repeat purchases"**
2. Or after purchase: Go to **Manage Direct** → Select security → **Edit** → Enable reinvestment

### Set Up Scheduled Purchases

1. Go to **"BuyDirect"**
2. Complete purchase setup
3. Select **"Schedule this purchase to repeat"**
4. Choose frequency (monthly, quarterly, etc.)

---

## Auction Calendar

T-Bills are sold at auction on a regular schedule:

| Security | Auction Day | Settlement |
|----------|-------------|------------|
| 4-week Bill | Tuesday | Thursday |
| 8-week Bill | Tuesday | Thursday |
| 13-week Bill | Monday | Thursday |
| 26-week Bill | Monday | Thursday |
| 52-week Bill | Every 4 weeks | Following Thursday |

Full calendar: [TreasuryDirect.gov/auctions/upcoming](https://www.treasurydirect.gov/auctions/upcoming/)

---

## Tax Considerations

> ⚠️ **Consult a tax professional for your specific situation**

General information:
- Treasury interest is **federally taxable** but **exempt from state/local tax**
- You'll receive a **1099-INT** each year
- T-Bill "discount" is treated as interest income
- I-Bond interest can be **deferred** until redemption or maturity
- Crypto-to-USD conversion is a **taxable event** (capital gains/losses)

---

## Troubleshooting

### "Bank account not verified" on TreasuryDirect
- TreasuryDirect sends two small test deposits to your bank
- Log in to your bank, find the deposit amounts
- Enter them on TreasuryDirect to verify

### "Purchase limit reached" for I-Bonds
- Electronic I-Bond limit: $10,000 per SSN per year
- Workaround: Buy paper I-Bonds with tax refund (additional $5,000)
- Or buy different securities (T-Bills have no limit)

### Auction already closed
- T-Bill auctions happen on specific days
- If you miss one, you can submit for the next auction
- Check calendar: [TreasuryDirect.gov/auctions/upcoming](https://www.treasurydirect.gov/auctions/upcoming/)

### Funds not appearing in TreasuryDirect
- Bank debits usually occur on auction day
- Securities appear after settlement (typically Thursday)
- Check "Pending Transactions" in your account

---

## Security Best Practices

1. ✅ Use a **password manager** for TreasuryDirect credentials
2. ✅ Enable **account alerts** for all transactions
3. ✅ Use **hardware 2FA** (YubiKey) for exchanges
4. ✅ Never share your TreasuryDirect account number
5. ✅ Use a **dedicated email** for financial accounts
6. ✅ Keep **offline backup** of all confirmation numbers

---

## Useful Links

| Resource | URL |
|----------|-----|
| TreasuryDirect (main) | [treasurydirect.gov](https://www.treasurydirect.gov/) |
| Open Account | [treasurydirect.gov/open-account](https://www.treasurydirect.gov/open-account/) |
| Auction Schedule | [treasurydirect.gov/auctions/upcoming](https://www.treasurydirect.gov/auctions/upcoming/) |
| I-Bond Rates | [treasurydirect.gov/savings-bonds/i-bonds](https://www.treasurydirect.gov/savings-bonds/i-bonds/) |
| T-Bill Info | [treasurydirect.gov/marketable-securities/treasury-bills](https://www.treasurydirect.gov/marketable-securities/treasury-bills/) |
| Forms & Publications | [treasurydirect.gov/forms](https://www.treasurydirect.gov/forms/) |

---

## Example: Complete Flow

Here's a real example of the complete process:

```
Day 1: Arbitrage profit of 5.5 ETH captured
       → 70% (3.85 ETH) sent to staging wallet
       → 30% (1.65 ETH) sent to operations

Day 2: Staging wallet reaches 5 ETH threshold
       → Transfer 5 ETH to Coinbase deposit address

Day 3: ETH arrives on Coinbase
       → Sell 5 ETH for ~$18,500 USD
       → Initiate withdrawal to bank

Day 5: USD arrives in bank account
       → Log into TreasuryDirect
       → Buy $18,000 in 13-week T-Bills
       → Save confirmation: #123456789, CUSIP: 912797AB1

Day 8: T-Bill auction settles
       → Security appears in TreasuryDirect account
       → Record purchase in tracking spreadsheet

Week 13: T-Bill matures
        → Principal + interest returned
        → Auto-reinvest into new T-Bill
```

---

## Questions?

Open an issue at [StableExo/Copilot-Consciousness](https://github.com/StableExo/Copilot-Consciousness)

---

*This document is for informational purposes only and does not constitute financial, tax, or legal advice.*
