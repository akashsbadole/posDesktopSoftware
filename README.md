# POS Billing — Tauri + Next.js + SQLite + Neon

A production-ready desktop POS billing application with:
- **SQLite** for offline-first local storage (via Tauri/Rust)
- **Neon PostgreSQL** for cloud sync and multi-device access
- **Tauri** as the desktop shell (cross-platform: Windows, macOS, Linux)
- **Next.js 14** as the frontend framework

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Next.js Frontend               │
│  POSScreen │ Orders │ Products │ Dashboard  │
│                  lib/db.ts                  │
│      (calls Tauri invoke commands)          │
└──────────────┬──────────────────────────────┘
               │ tauri::invoke()
┌──────────────▼──────────────────────────────┐
│            Rust Backend (Tauri)             │
│                                             │
│  src-tauri/src/db.rs   ──►  pos.db (SQLite) │
│  src-tauri/src/neon.rs ──►  Neon PostgreSQL  │
└─────────────────────────────────────────────┘
```

### Data Flow
- **In Tauri (production)**: All DB calls go through `tauri::invoke()` → Rust → SQLite file on disk
- **In browser (dev)**: Falls back to `localStorage` automatically (no Tauri needed for UI dev)
- **Neon sync**: On demand from Settings screen — pushes unsynced orders up, pulls remote orders down

---

## Features

| Feature | Backend |
|---|---|
| Product CRUD with categories, tax, stock, barcode | SQLite |
| Cart with per-item discount + global discount | Pure JS (calcCart) |
| Tax calculation per product | Pure JS |
| Cash/Card/UPI payments with change calculation | Pure JS |
| Order saving with stock deduction | SQLite |
| Order refund with stock restoration | SQLite |
| Receipt generation | Pure JS |
| Daily summary, weekly revenue chart | SQLite aggregate queries |
| Top products by revenue | SQLite GROUP BY |
| Low stock alerts | SQLite |
| Settings persistence | SQLite key-value table |
| Neon cloud sync (push/pull) | Rust HTTP → Neon API |

---

## Prerequisites

### 1. Node.js (v18+)
```bash
# Check
node --version
```

### 2. Rust
```bash
# Install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 3. Tauri system dependencies

**Windows**: Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

**macOS**:
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.0-dev build-essential curl wget file \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## Setup & Run

```bash
# 1. Install Node dependencies
npm install

# 2. Run as web app only (no Rust, uses localStorage)
npm run dev
# → Open http://localhost:3000

# 3. Run as Tauri desktop app (uses SQLite)
npm run tauri:dev

# 4. Build desktop installer
npm run tauri:build
# Output: src-tauri/target/release/bundle/
```

---

## Neon PostgreSQL Setup (Optional)

1. Sign up at **https://neon.tech** (free tier available)
2. Create a new project
3. Go to **Dashboard → Connection Details**
4. Copy the connection string:
   ```
   postgres://username:password@ep-xxx-xxx.region.neon.tech/neondb
   ```
5. Open POS app → **Settings → Neon PostgreSQL Sync**
6. Paste the connection string and click **Save Settings**
7. Click **Push to Neon** to sync local orders
8. Click **Pull from Neon** on another device to import

### What syncs
- Orders and order items (push/pull)
- Schema is auto-created on first sync (`pos_orders` table)

### What stays local only
- Products (managed per-device)
- Settings (managed per-device)

---

## SQLite Database Location

| OS | Path |
|---|---|
| Windows | `%APPDATA%\com.pos.billing\pos.db` |
| macOS | `~/Library/Application Support/com.pos.billing/pos.db` |
| Linux | `~/.local/share/com.pos.billing/pos.db` |

**Backup**: Just copy `pos.db` to back up all your data.

---

## Project Structure

```
pos-tauri/
├── app/
│   ├── globals.css         # Tailwind + custom styles
│   ├── layout.tsx
│   └── page.tsx            # Screen router
├── components/
│   ├── Sidebar.tsx
│   ├── POSScreen.tsx       # Billing + cart
│   ├── OrdersScreen.tsx    # Order history + refunds
│   ├── ProductsScreen.tsx  # Product management
│   ├── DashboardScreen.tsx # Analytics
│   └── SettingsScreen.tsx  # Settings + Neon sync
├── lib/
│   └── db.ts               # DB abstraction (Tauri invoke + localStorage fallback)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs         # Tauri commands registration
│   │   ├── db.rs           # SQLite operations (rusqlite)
│   │   └── neon.rs         # Neon HTTP sync
│   ├── Cargo.toml          # Rust dependencies
│   ├── build.rs
│   └── tauri.conf.json     # Tauri configuration
├── package.json
├── next.config.js          # Static export for Tauri
└── tailwind.config.js
```
