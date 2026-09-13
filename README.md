# POS Billing — Free & Open Source

A completely free, production-ready desktop POS billing application with:
- **SQLite** for offline-first local storage (via Tauri/Rust)
- **Neon PostgreSQL** for cloud sync and multi-device access
- **Tauri** as the desktop shell (cross-platform: Windows, macOS, Linux)
- **Next.js 14** as the frontend framework

**No fees, no subscriptions, no limitations.** All features included for unlimited stores.

## screenshot
![Dashboard](https://github.com/akashsbadole/posDesktopSoftware/blob/main/Appixen-POS-Billing.png)


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

## Support the Project

This POS application is **completely free** and open source. If you find it valuable, here are ways to support us:

### Direct Support
- **Donate**: Support ongoing development via [Buy Me a Coffee](https://www.buymeacoffee.com/akashbadole)
- **Patreon-Style Support**: Join our community for exclusive benefits

### Additional Services
- **Custom Development**: Tailored integrations and features
- **Training Programs**: Online courses, webinars, and certification
- **Consulting Services**: Business optimization and menu engineering
- **Priority Support**: Fast response and dedicated assistance
- **White-label Solutions**: Custom branded versions for agencies

### Hardware & Partnerships
- **Hardware Bundles**: Recommended POS computers, printers, and accessories
- **Affiliate Marketing**: Earn commissions promoting complementary products

Contact us at info@appixen.com for services and partnerships.

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

## Cross-Platform Distribution

### GitHub Actions (Recommended)
This project includes a GitHub Actions workflow in `.github/workflows/release.yml`. When you push a tag (e.g., `v1.0.0`) to your repository, it will automatically build:
- **Windows**: `.msi` (Wix Installer)
- **Linux**: `.deb` (Ubuntu/Debian) and `AppImage`
- **macOS**: `.dmg` (Disk Image)

The builds will be available as a draft release in your GitHub "Releases" section.

### Building for Linux on Windows (WSL)
If you want to build the Linux `.deb` package locally on a Windows machine:
1. **Install WSL2**: Run `wsl --install` in PowerShell.
2. **Install Ubuntu**: Open the Ubuntu terminal from the Microsoft Store.
3. **Setup Environment**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm build-essential curl wget file libssl-dev libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"
   ```
4. **Clone & Build**:
   ```bash
   git clone <your-repo-url>
   cd pos-tauri
   npm install
   npm run tauri:build:linux64
   ```

### Microsoft Store Submission (Windows)
To publish your application as a Windows app in the Microsoft Store:
1. **Create a Partner Center Account**: Register at [partner.microsoft.com](https://partner.microsoft.com/dashboard/registration).
2. **Reserve App Name**: In the dashboard, reserve your product name.
3. **Configure MSIX**: Update `src-tauri/tauri.conf.json` under `bundle > windows > msix` with your Publisher ID and Identity Name provided by Microsoft.
4. **Build MSIX**:
   ```bash
   npm run tauri:build -- --bundle msix
   ```
5. **Upload**: Upload the generated `.msix` file (found in `src-tauri/target/release/bundle/msix/`) to your submission in the Partner Center.

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
