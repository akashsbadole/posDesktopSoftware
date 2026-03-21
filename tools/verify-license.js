#!/usr/bin/env node
// tools/verify-license.js
//
// Standalone license key verifier
// Run: node tools/verify-license.js POS-PRO-20260321-A3F8K2M1-4B7C9D2E1F3A5B8C

const crypto = require('crypto');

const LICENSE_SECRET = "POS_T4UR1_S3CRET_K3Y_2026_CHANGE_ME";

function computeHmac(payload) {
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET);
  hmac.update(payload);
  return hmac.digest('hex').slice(0, 16).toUpperCase();
}

function validateKey(key) {
  if (!key || key.trim().length === 0) {
    return { valid: false, tier: 'free', message: 'Empty key' };
  }

  const k = key.trim().toUpperCase();

  if (k === 'FREE' || k === 'POS-FREE') {
    return { valid: true, tier: 'free', message: 'Free tier (no license)' };
  }

  const parts = k.split('-');
  if (parts.length !== 5) {
    return { valid: false, tier: 'free', message: 'Invalid format. Expected 5 parts separated by dashes.' };
  }

  const [prefix, tierCode, dateStr, randomPart, hmacPart] = parts;

  if (prefix !== 'POS') {
    return { valid: false, tier: 'free', message: 'Invalid prefix. Must start with POS.' };
  }

  let tier;
  if (tierCode === 'PRO') tier = 'pro';
  else if (tierCode === 'BIZ') tier = 'business';
  else return { valid: false, tier: 'free', message: `Invalid tier "${tierCode}". Must be PRO or BIZ.` };

  if (!/^\d{8}$/.test(dateStr)) {
    return { valid: false, tier: 'free', message: 'Invalid date format. Expected YYYYMMDD.' };
  }

  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));

  if (year < 2024 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, tier: 'free', message: 'Invalid date values.' };
  }

  if (randomPart.length !== 8 || !/^[A-Z0-9]{8}$/.test(randomPart)) {
    return { valid: false, tier: 'free', message: 'Invalid random segment. Must be 8 alphanumeric chars.' };
  }

  if (hmacPart.length !== 16 || !/^[0-9A-F]{16}$/.test(hmacPart)) {
    return { valid: false, tier: 'free', message: 'Invalid HMAC signature. Must be 16 hex chars.' };
  }

  // Verify HMAC
  const payload = `POS-${tierCode}-${dateStr}-${randomPart}`;
  const expectedHmac = computeHmac(payload);

  if (hmacPart !== expectedHmac) {
    return { valid: false, tier: 'free', message: 'Invalid signature. This key may be forged or tampered.' };
  }

  // Check expiry
  const issueDate = new Date(year, month - 1, day);
  const expiryDate = new Date(year + 1, month - 1, Math.min(day, 28));
  const now = new Date();

  if (now > expiryDate) {
    return {
      valid: false,
      tier: 'free',
      message: `License expired on ${expiryDate.toISOString().slice(0, 10)}.`,
    };
  }

  const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  return {
    valid: true,
    tier,
    message: `Valid ${tier === 'pro' ? 'Pro' : 'Business'} license. ${daysLeft} days remaining.`,
    expiresAt: expiryDate.toISOString().slice(0, 10),
    issuedAt: issueDate.toISOString().slice(0, 10),
    daysLeft,
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const key = process.argv[2];

if (!key) {
  console.log(`
Usage: node tools/verify-license.js <LICENSE_KEY>

Example:
  node tools/verify-license.js POS-PRO-20260321-A3F8K2M1-4B7C9D2E1F3A5B8C
`);
  process.exit(1);
}

const result = validateKey(key);

console.log(`\n┌─────────────────────────────────────┐`);
console.log(`│  License Key Verification           │`);
console.log(`└─────────────────────────────────────┘`);
console.log(`  Key:       ${key.trim()}`);
console.log(`  Valid:     ${result.valid ? '✅ YES' : '❌ NO'}`);
console.log(`  Tier:      ${result.tier}`);

if (result.issuedAt) console.log(`  Issued:    ${result.issuedAt}`);
if (result.expiresAt) console.log(`  Expires:   ${result.expiresAt}`);
if (result.daysLeft) console.log(`  Days Left: ${result.daysLeft}`);

console.log(`  Message:   ${result.message}`);
console.log();
