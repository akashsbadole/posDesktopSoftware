#!/usr/bin/env node
// tools/generate-license.js
//
// Standalone license key generator for POS Billing App
// Run: node tools/generate-license.js --tier pro --count 10
//      node tools/generate-license.js --tier business --date 2026-12-31 --count 5
//
// IMPORTANT: The LICENSE_SECRET must match the one in src-tauri/src/license.rs

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// This MUST match the secret in src-tauri/src/license.rs
const LICENSE_SECRET = "POS_T4UR1_S3CRET_K3Y_2026_CHANGE_ME";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function computeHmac(payload) {
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET);
  hmac.update(payload);
  const hex = hmac.digest('hex');
  // Return first 16 hex chars (8 bytes) - uppercase to match Rust
  return hex.slice(0, 16).toUpperCase();
}

function generateRandom8() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateKey(tier, year, month, day) {
  const tierCode = tier === 'pro' ? 'PRO' : 'BIZ';
  const dateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const randomPart = generateRandom8();
  const payload = `POS-${tierCode}-${dateStr}-${randomPart}`;
  const hmacSig = computeHmac(payload);
  return `POS-${tierCode}-${dateStr}-${randomPart}-${hmacSig}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    tier: 'pro',
    count: 1,
    date: null,
    outputFile: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tier':
      case '-t':
        config.tier = args[++i]?.toLowerCase();
        break;
      case '--count':
      case '-c':
        config.count = parseInt(args[++i], 10) || 1;
        break;
      case '--date':
      case '-d':
        config.date = args[++i];
        break;
      case '--output':
      case '-o':
        config.outputFile = args[++i];
        break;
      case '--help':
      case '-h':
        config.help = true;
        break;
    }
  }

  return config;
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║          POS Billing App - License Key Generator        ║
╚══════════════════════════════════════════════════════════╝

Usage:
  node tools/generate-license.js [options]

Options:
  --tier, -t      pro | business     (default: pro)
  --count, -c     Number of keys     (default: 1)
  --date, -d      YYYY-MM-DD        (default: today)
  --output, -o    Output file path   (default: print to console)
  --help, -h      Show this help

Examples:
  node tools/generate-license.js --tier pro --count 10
  node tools/generate-license.js -t business -c 5 -d 2026-12-31
  node tools/generate-license.js -t pro -c 100 -o licenses-pro.csv

Key Format:
  POS-{TIER}-{YYYYMMDD}-{RANDOM8}-{HMAC16}

  Example: POS-PRO-20260321-A3F8K2M1-4B7C9D2E1F3A5B8C

IMPORTANT:
  The LICENSE_SECRET in this file must match the one in:
  src-tauri/src/license.rs

  Current secret hash: ${crypto.createHash('sha256').update(LICENSE_SECRET).digest('hex').slice(0, 8)}...
`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function main() {
  const config = parseArgs();

  if (config.help) {
    printHelp();
    process.exit(0);
  }

  if (!['pro', 'business'].includes(config.tier)) {
    console.error(`Error: Invalid tier "${config.tier}". Must be "pro" or "business".`);
    process.exit(1);
  }

  if (config.count < 1 || config.count > 10000) {
    console.error('Error: Count must be between 1 and 10000.');
    process.exit(1);
  }

  let year, month, day;
  if (config.date) {
    const parsed = new Date(config.date);
    if (isNaN(parsed.getTime())) {
      console.error(`Error: Invalid date "${config.date}". Use YYYY-MM-DD format.`);
      process.exit(1);
    }
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
  }

  // Generate keys
  const keys = [];
  for (let i = 0; i < config.count; i++) {
    keys.push(generateKey(config.tier, year, month, day));
  }

  // Output
  if (config.outputFile) {
    // CSV format with header
    const lines = ['key,tier,issue_date,expiry_date'];
    const expiryDate = new Date(year + 1, month - 1, Math.min(day, 28));
    const issueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const expiry = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`;
    
    for (const key of keys) {
      lines.push(`${key},${config.tier},${issueDate},${expiry}`);
    }
    
    fs.writeFileSync(config.outputFile, lines.join('\n'), 'utf-8');
    console.log(`\n✅ Generated ${config.count} ${config.tier} license keys`);
    console.log(`📄 Saved to: ${config.outputFile}`);
  } else {
    // Print to console
    console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
    console.log(`║  Generated ${String(config.count).padStart(4)} ${config.tier.toUpperCase().padEnd(8)} license keys                                  ║`);
    console.log(`║  Issue date: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}                                          ║`);
    console.log(`║  Expires:    ${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}                                          ║`);
    console.log(`╚══════════════════════════════════════════════════════════════════════╝\n`);
    
    keys.forEach((key, i) => {
      console.log(`  ${String(i + 1).padStart(4)}. ${key}`);
    });
    
    console.log(`\n💡 Copy these keys and give them to customers after payment.`);
    console.log(`🔒 Each key is signed with HMAC-SHA256 and cannot be forged.\n`);
  }
}

main();
