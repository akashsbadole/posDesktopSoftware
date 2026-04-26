# Enable Online Mode - Quick Setup Guide

## 🎯 Goal
Enable cloud synchronization with Neon PostgreSQL so your POS works both offline AND online with automatic sync.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Create Neon Database (2 minutes)

1. Go to [Neon Console](https://console.neon.tech)
2. Click "Create Project"
3. Fill in:
   - **Project Name:** `pos-app` (or your choice)
   - **Database Name:** `pos_db`
   - **Region:** Choose closest to you
4. Click "Create Project"
5. Wait for creation (usually 30 seconds)

### Step 2: Get Connection String (1 minute)

1. In Neon Console, go to your project
2. Click "Connection Details" (top right)
3. Copy the connection string that looks like:
   ```
   postgres://user:password@host/database
   ```
4. Keep this safe - you'll need it

### Step 3: Add to .env (1 minute)

1. Open `.env` file in your project
2. Find this line:
   ```env
   NEXT_PUBLIC_NEON_URL=
   ```
3. Paste your connection string:
   ```env
   NEXT_PUBLIC_NEON_URL=postgres://user:password@host/database
   ```
4. Save the file

### Step 4: Restart App (1 minute)

```bash
# Stop current app (Ctrl+C)

# Restart
npm run dev
# or
npm run tauri dev
```

### Step 5: Verify (1 minute)

1. Open browser console (F12)
2. Login to your POS
3. Look for sync messages like:
   ```
   [Sync] Automatic sync started
   [Sync] Synced to Neon
   [Sync] Synced from Neon
   ```
4. ✅ Done! Online mode is enabled

---

## 🔍 How to Verify It's Working

### Check 1: Browser Console
```javascript
// Open F12 → Console
// You should see sync messages every 5 minutes
[Sync] Automatic sync started
[Sync] Synced to Neon
[Sync] Synced from Neon
```

### Check 2: Header Bar
- Look for "Sync" indicator in top right
- Should show last sync time
- Updates every 5 minutes

### Check 3: Settings
1. Go to Settings screen
2. Look for "Neon URL" field
3. Should show your connection string

### Check 4: Test Sync
1. Add a product in one location
2. Wait 5 minutes (or manually trigger sync)
3. Check another device/browser
4. ✅ Product should appear

---

## 🌐 How Online Mode Works

### Automatic Sync (Every 5 Minutes)
```
Local Data → Upload to Neon → Download from Neon → Local Data
```

### What Gets Synced
- ✅ Products
- ✅ Orders
- ✅ Customers
- ✅ Staff
- ✅ Inventory
- ✅ Settings
- ✅ All data

### When It Syncs
- ✅ Every 5 minutes automatically
- ✅ When you login
- ✅ When you add/edit data
- ✅ When you go online

### What Happens Offline
- ✅ App works normally
- ✅ Data stored locally
- ✅ No sync errors
- ✅ Syncs when online again

---

## 🔐 Security

### Your Data is Safe
- ✅ SSL/TLS encryption in transit
- ✅ Neon handles encryption at rest
- ✅ Organization-level isolation
- ✅ No data sharing between users

### Connection String Security
- ✅ Keep it private
- ✅ Don't commit to git
- ✅ Use .env file (not in code)
- ✅ Rotate password if exposed

---

## 🚀 Advanced Setup

### Custom Sync Interval

If you want to change sync interval from 5 minutes:

**File:** `app/page.tsx`

Find this line:
```typescript
5 * 60 * 1000, // 5 minutes
```

Change to:
```typescript
1 * 60 * 1000, // 1 minute
// or
10 * 60 * 1000, // 10 minutes
```

### Manual Sync

To manually trigger sync:

```javascript
// In browser console
const { syncToNeon, syncFromNeon } = await import("@/lib/db");
await syncToNeon("default");
await syncFromNeon("default");
console.log("Sync complete!");
```

### Disable Auto-Sync

If you want to disable automatic sync:

**File:** `app/page.tsx`

Comment out this section:
```typescript
// useEffect(() => {
//   if (isAuthenticated && premiumEnabled && settings?.neon_url) {
//     // ... sync code
//   }
// }, [...]);
```

---

## 🐛 Troubleshooting

### Issue: "Sync not working"

**Check 1:** Verify Neon URL
```env
# Should look like this:
NEXT_PUBLIC_NEON_URL=postgres://user:password@host/database

# NOT like this:
NEXT_PUBLIC_NEON_URL=
NEXT_PUBLIC_NEON_URL=postgres://
```

**Check 2:** Restart app
```bash
# Stop app (Ctrl+C)
npm run dev
```

**Check 3:** Check browser console
```javascript
// F12 → Console
// Look for errors
```

### Issue: "Connection refused"

**Solution:** Check Neon status
1. Go to [Neon Console](https://console.neon.tech)
2. Check if project is running
3. Check if connection string is correct
4. Try copying connection string again

### Issue: "Sync messages not appearing"

**Check:** Is premiumEnabled true?
```javascript
// In browser console
const { premiumEnabled } = useSettingsStore.getState();
console.log(premiumEnabled);
```

If false, sync won't run. This is by design - sync only runs when premium is enabled.

### Issue: "Data not syncing"

**Check 1:** Is app online?
```javascript
navigator.onLine // Should be true
```

**Check 2:** Are there errors?
```javascript
// F12 → Console → Look for red errors
```

**Check 3:** Check sync interval
```javascript
// Default is 5 minutes
// Wait 5 minutes and check console
```

---

## 📊 Monitoring Sync

### View Sync Status

**In Header Bar:**
- Look for "Sync" indicator
- Shows last sync time
- Updates every 5 minutes

**In Browser Console:**
```javascript
// F12 → Console
// Look for messages like:
[Sync] Automatic sync started
[Sync] Synced to Neon
[Sync] Synced from Neon
```

### Check Sync Logs

```javascript
// In browser console
// Get last sync time
const { lastSyncTime } = useSettingsStore.getState();
console.log(lastSyncTime);
```

---

## 🎯 What's Included

### Offline Mode (Always Works)
- ✅ SQLite database
- ✅ localStorage backup
- ✅ Works without internet
- ✅ Fast local access

### Online Mode (When Neon URL Set)
- ✅ Cloud database
- ✅ Real-time sync
- ✅ Multi-device access
- ✅ Automatic backup

### Hybrid Mode (Best of Both)
- ✅ Works offline
- ✅ Syncs when online
- ✅ No data loss
- ✅ Seamless experience

---

## 📝 Environment Variables

### Required for Online Mode
```env
NEXT_PUBLIC_NEON_URL=postgres://user:password@host/database
```

### Optional
```env
# WhatsApp integration
NEXT_PUBLIC_WHATSAPP_API=

# Encryption key
TAURI_ENCRYPTION_KEY=your-secure-key
```

### Already Configured
```env
NODE_ENV=production
NEXT_PUBLIC_DEFAULT_STORE_NAME=My POS Store
NEXT_PUBLIC_DEFAULT_STORE_ID=default
NEXT_PUBLIC_ENABLE_PREMIUM=false
```

---

## ✅ Verification Checklist

- [ ] Created Neon project
- [ ] Copied connection string
- [ ] Added to .env file
- [ ] Restarted app
- [ ] Checked browser console
- [ ] See sync messages
- [ ] Verified in header bar
- [ ] Tested offline mode
- [ ] Tested online mode

---

## 🚀 Next Steps

### After Setup:
1. ✅ Online mode is enabled
2. ✅ Auto-sync every 5 minutes
3. ✅ Works offline and online
4. ✅ Data syncs automatically

### To Deploy:
1. Set NEXT_PUBLIC_NEON_URL in production
2. Deploy app
3. Users get online + offline support

### To Scale:
1. Neon handles scaling automatically
2. No additional setup needed
3. Works with unlimited users
4. Works with unlimited stores

---

## 💡 Tips

### Tip 1: Test Sync
```javascript
// Add a product
// Wait 5 minutes
// Check another device
// Product should appear
```

### Tip 2: Monitor Performance
```javascript
// Check sync time in console
// Should be < 1 second
// If slower, check internet
```

### Tip 3: Backup Data
```javascript
// Neon automatically backs up
// No manual backup needed
// Data is safe
```

---

## 📞 Support

### If Something Goes Wrong:
1. Check browser console (F12)
2. Look for error messages
3. Check Neon console
4. Verify connection string
5. Restart app

### Common Issues:
- **No sync messages:** Check if Neon URL is set
- **Connection refused:** Check Neon project status
- **Slow sync:** Check internet speed
- **Data not syncing:** Check if online

---

## 🎉 You're Done!

Your POS now has:
- ✅ Offline mode (always works)
- ✅ Online mode (cloud sync)
- ✅ Automatic sync (every 5 minutes)
- ✅ Multi-device support
- ✅ Automatic backup

**Enjoy your completely free POS with online and offline support!** 🚀

---

## Quick Reference

### Enable Online Mode
```env
NEXT_PUBLIC_NEON_URL=postgres://user:password@host/database
```

### Restart App
```bash
npm run dev
```

### Check Sync
```javascript
// F12 → Console
// Look for sync messages
```

### Test Offline
```javascript
// Disconnect internet
// App still works
// Syncs when online
```

---

**That's it! Online mode is now enabled.** ✨
