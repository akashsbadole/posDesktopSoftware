# POS Billing App — License System Guide

Complete guide for generating, distributing, and validating premium license keys.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Format](#key-format)
- [Installation](#installation)
- [Generating License Keys](#generating-license-keys)
- [Verifying License Keys](#verifying-license-keys)
- [Tier Features](#tier-features)
- [Customer Activation Flow](#customer-activation-flow)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Changing the Secret Key](#changing-the-secret-key)

---

## Overview

The POS Billing App uses an **offline, HMAC-SHA256 signed license key** system.

- No server required — keys are validated locally on the user's machine
- Keys cannot be forged without the secret key
- Each key is tied to a tier (`pro` or `business`) and expires after 1 year
- You (the developer) generate keys and give them to customers after payment

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR MACHINE                         │
│                                                         │
│  tools/generate-license.js                              │
│       │                                                 │
│       ├── Generates keys using HMAC-SHA256              │
│       └── Outputs to console or CSV file                │
│                                                         │
│  tools/verify-license.js                                │
│       └── Standalone key verification (for your use)    │
└─────────────────────────────────────────────────────────┘
                         │
                    You send key
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               CUSTOMER'S MACHINE                        │
│                                                         │
│  App UI (UpgradeScreen)                                 │
│       │                                                 │
│       ▼                                                 │
│  lib/stores/licenseStore.ts                             │
│       │                                                 │
│       ▼                                                 │
│  lib/db.ts → dbValidateLicense()                        │
│       │                                                 │
│       ▼ Tauri invoke                                    │
│  src-tauri/src/license.rs                               │
│       │                                                 │
│       ├── Checks format (POS-TIER-DATE-RANDOM-HMAC)     │
│       ├── Verifies HMAC-SHA256 signature                │
│       ├── Checks expiry (1 year from issue date)        │
│       └── Returns { valid, tier, expires_at, message }  │
└─────────────────────────────────────────────────────────┘
```

---

## Key Format

```
POS-{TIER}-{YYYYMMDD}-{RANDOM8}-{HMAC16}
```

| Part | Example | Description |
|------|---------|-------------|
| Prefix | `POS` | Fixed prefix |
| Tier | `PRO` or `BIZ` | Plan tier |
| Date | `20260321` | Issue date (YYYYMMDD) |
| Random | `A3F8K2M1` | 8 random alphanumeric chars |
| HMAC | `4B7C9D2E1F3A5B8C` | 16 hex chars (first 8 bytes of HMAC-SHA256) |

**Full example:**
```
POS-PRO-20260321-D2T4KEQS-74A101259136CC9A
```

---

## Installation

### Prerequisites

- **Node.js** v16+ (for the generator tools)
- **Rust** (for the app's validation backend — already part of Tauri)

### Setup

The tools are included in the project at:

```
pos-tauri/
├── tools/
│   ├── generate-license.js    ← Key generator
│   └── verify-license.js      ← Key verifier
└── src-tauri/src/
    └── license.rs             ← Rust validation module
```

No installation needed — just run with Node.js.

---

## Generating License Keys

### Basic Usage

```bash
node tools/generate-license.js [options]
```

### Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--tier` | `-t` | `pro` or `business` | `pro` |
| `--count` | `-c` | Number of keys to generate | `1` |
| `--date` | `-d` | Issue date (`YYYY-MM-DD`) | Today |
| `--output` | `-o` | Output CSV file path | Console |
| `--help` | `-h` | Show help | — |

### Examples

```bash
# Generate 1 Pro key
node tools/generate-license.js --tier pro

# Generate 10 Pro keys
node tools/generate-license.js -t pro -c 10

# Generate 5 Business keys for a specific date
node tools/generate-license.js -t business -c 5 -d 2026-12-31

# Generate 100 keys and save to CSV
node tools/generate-license.js -t pro -c 100 -o keys-pro-batch1.csv

# Generate 50 Business keys to CSV
node tools/generate-license.js -t business -c 50 -o keys-biz-batch1.csv
```

### Console Output

```
╔══════════════════════════════════════════════════════════════════════╗
║  Generated    3 PRO      license keys                                  ║
║  Issue date: 2026-03-21                                          ║
║  Expires:    2027-03-21                                          ║
╚══════════════════════════════════════════════════════════════════════╝

     1. POS-PRO-20260321-D2T4KEQS-74A101259136CC9A
     2. POS-PRO-20260321-6VAG7FWD-05833FC0C99EB273
     3. POS-PRO-20260321-POR3USPK-753A431C69D685E7

💡 Copy these keys and give them to customers after payment.
🔒 Each key is signed with HMAC-SHA256 and cannot be forged.
```

### CSV Output

When using `--output`, the file contains:

```csv
key,tier,issue_date,expiry_date
POS-PRO-20260321-D2T4KEQS-74A101259136CC9A,pro,2026-03-21,2027-03-21
POS-PRO-20260321-6VAG7FWD-05833FC0C99EB273,pro,2026-03-21,2027-03-21
```

**Keep this CSV safe** — it's your record of issued keys.

---

## Verifying License Keys

### Basic Usage

```bash
node tools/verify-license.js <LICENSE_KEY>
```

### Examples

```bash
# Verify a valid key
node tools/verify-license.js POS-PRO-20260321-D2T4KEQS-74A101259136CC9A

# Verify an invalid key
node tools/verify-license.js INVALID-KEY-123

# Verify a tampered key
node tools/verify-license.js POS-BIZ-20260321-D2T4KEQS-74A101259136CC9A
# (Original was PRO, someone changed to BIZ — will show INVALID)
```

### Output

```
┌─────────────────────────────────────┐
│  License Key Verification           │
└─────────────────────────────────────┘
  Key:       POS-PRO-20260321-D2T4KEQS-74A101259136CC9A
  Valid:     ✅ YES
  Tier:      pro
  Issued:    2026-03-21
  Expires:   2027-03-21
  Days Left: 365
  Message:   Valid Pro license. 365 days remaining.
```

---

## Tier Features

### Free (No License)

- POS Billing
- Product Management
- Order History
- Basic Dashboard
- Basic Reports
- Settings & Configuration
- Backup & Restore

### Pro (`POS-PRO-*`) — ₹149/6 months

Everything in Free, plus:

- Kitchen Display System (KDS)
- Customer CRM & Loyalty Points
- Discount Coupons & Wallet
- Advanced Analytics & Reports
- GST / Tax Reports
- Day End Reconciliation
- Custom Receipt Builder

### Business (`POS-BIZ-*`) — ₹299/6 months

Everything in Pro, plus:

- Staff Scheduling & Management
- Table Reservations
- Ingredient-Based Inventory
- Suppliers & Purchase Orders
- Audit Dashboard
- Cash Drawer Management
- Bulk Import/Export
- Expense Tracking
- Refund Approval System
- Activity Logs

---

## Customer Activation Flow

### Step 1: Customer Purchases

Customer pays you (UPI, bank transfer, etc.) for Pro or Business plan.

### Step 2: You Generate & Send Key

```bash
# Generate a single key for this customer
node tools/generate-license.js --tier pro
# Output: POS-PRO-20260321-D2T4KEQS-74A101259136CC9A
```

Send the key to the customer via WhatsApp, email, etc.

### Step 3: Customer Activates

1. Open the POS app
2. Click **UPGRADE** in the sidebar (or click any locked feature)
3. Click **Activate License Key**
4. Paste the key and click **Activate**
5. App validates via Rust backend (HMAC check)
6. If valid → tier is unlocked immediately

### Step 4: Customer Sees Unlocked Features

- Lock icons disappear from sidebar
- Premium screens become accessible
- Upgrade screen shows "Current Plan" badge

---

## Security

### How It Works

1. **Key generation**: Random 8-char segment + HMAC-SHA256 signature
2. **HMAC payload**: `POS-{TIER}-{DATE}-{RANDOM}` (everything except the signature)
3. **Signature**: First 8 bytes (16 hex chars) of `HMAC-SHA256(secret, payload)`
4. **Validation**: Recompute HMAC and compare — any tampering breaks the signature

### What's Protected

| Attack | Protected? | Why |
|--------|-----------|-----|
| Forge a key from scratch | ✅ Yes | Need the secret to compute valid HMAC |
| Change tier (PRO→BIZ) | ✅ Yes | HMAC covers the tier field |
| Change issue date | ✅ Yes | HMAC covers the date field |
| Reuse an old key | ✅ Yes | Expiry check (1 year from issue) |
| Share one key on multiple machines | ⚠️ Partial | Each machine accepts it, but you control distribution |

### What's NOT Protected

| Risk | Mitigation |
|------|-----------|
| Customer shares key with others | Issue unique keys per customer, track in your CSV |
| Customer modifies local SQLite to set tier | Possible but unlikely — most users won't know how |
| Reverse-engineer the secret from keys | HMAC-SHA256 is cryptographically one-way |

### Recommendations

1. **Change the default secret** before shipping (see below)
2. **Track issued keys** in your CSV — know which key belongs to which customer
3. **Issue unique keys per customer** — don't reuse keys
4. **Rotate the secret** periodically if you suspect leaks (old keys become invalid)

---

## Troubleshooting

### "Invalid license key signature"

- The key was tampered with (tier, date, or random part changed)
- The key was generated with a different secret
- The key has a typo

**Fix**: Generate a new key with the correct secret.

### "License key has expired"

- The key's issue date is more than 1 year ago

**Fix**: Generate a new key with today's date.

### "Invalid format"

- The key doesn't match `POS-TIER-DATE-RANDOM-HMAC` format
- Missing parts, extra dashes, or wrong number of segments

**Fix**: Check the key was copied completely without truncation.

### Demo keys from the app don't work after rebuild

The in-app "Demo Pro Key" / "Demo Business Key" buttons call the Rust `generate_license` command, which uses the same secret. If you change the secret in `license.rs`, regenerate demo keys from the app.

### TypeScript errors after adding license system

Run `npx tsc --noEmit` to check. Common issues:
- Missing `hmac` and `sha2` crates in `Cargo.toml`
- Forgot to add `mod license;` in `main.rs`

---

## Changing the Secret Key

**⚠️ Do this before shipping to production.**

### Step 1: Generate a new secret

```bash
# Generate a random 32-char secret
node -e "console.log(require('crypto').randomBytes(24).toString('hex').toUpperCase())"
# Example output: A1B2C3D4E5F6789012345678ABCDEF0123456789ABCDEF01
```

### Step 2: Update Rust file

Edit `src-tauri/src/license.rs` (line 14):

```rust
const LICENSE_SECRET: &str = "YOUR_NEW_SECRET_HERE";
```

### Step 3: Update generator tools

Edit `tools/generate-license.js` (line 12):

```javascript
const LICENSE_SECRET = "YOUR_NEW_SECRET_HERE";
```

Edit `tools/verify-license.js` (line 5):

```javascript
const LICENSE_SECRET = "YOUR_NEW_SECRET_HERE";
```

### Step 4: Test

```bash
# Generate a key with the new secret
node tools/generate-license.js -t pro -c 1

# Verify it works
node tools/verify-license.js <GENERATED_KEY>
```

**All previously generated keys will become invalid** after changing the secret.

---

## File Reference

```
pos-tauri/
├── tools/
│   ├── generate-license.js     Key generator (Node.js)
│   └── verify-license.js       Key verifier (Node.js)
├── src-tauri/
│   ├── Cargo.toml              hmac + sha2 dependencies
│   └── src/
│       ├── main.rs             validate_license & generate_license commands
│       └── license.rs          HMAC-SHA256 validation logic
├── lib/
│   ├── db.ts                   dbValidateLicense() & dbGenerateLicense()
│   ├── premium.ts              Tier definitions, feature mapping
│   └── stores/
│       └── licenseStore.ts     Zustand store (uses Rust validation)
└── components/
    ├── UpgradeScreen.tsx        Pricing page + key activation
    └── PaywallModal.tsx         Shows when locked feature clicked
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Generate 1 Pro key | `node tools/generate-license.js -t pro` |
| Generate 10 Business keys | `node tools/generate-license.js -t business -c 10` |
| Export keys to CSV | `node tools/generate-license.js -t pro -c 100 -o file.csv` |
| Verify a key | `node tools/verify-license.js POS-PRO-...` |
| Show help | `node tools/generate-license.js --help` |


--------////////////////--------------------------
 node "C:/Users/akash/Downloads/pos-tauri/tools/generate-license.js" --tier pro --count 3
╔══════════════════════════════════════════════════════════════════════╗
║  Generated    3 PRO      license keys                                  ║
║  Issue date: 2026-03-21                                          ║
║  Expires:    2027-03-21                                          ║
╚══════════════════════════════════════════════════════════════════════╝
     1. POS-PRO-20260321-D2T4KEQS-74A101259136CC9A
     2. POS-PRO-20260321-6VAG7FWD-05833FC0C99EB273
     3. POS-PRO-20260321-POR3USPK-753A431C69D685E7
💡 Copy these keys and give them to customers after payment.
🔒 Each key is signed with HMAC-SHA256 and cannot be forged.