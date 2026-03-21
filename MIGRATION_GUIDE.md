# POS Billing — Tauri to Next.js Full-Stack Migration Guide

> Complete migration plan from Tauri desktop app to Next.js full-stack web application

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Target Architecture](#target-architecture)
3. [Tech Stack](#tech-stack)
4. [Phase 1: Database Setup](#phase-1-database-setup)
5. [Phase 2: Authentication](#phase-2-authentication)
6. [Phase 3: Core API Routes](#phase-3-core-api-routes)
7. [Phase 4: Feature API Routes](#phase-4-feature-api-routes)
8. [Phase 5: Frontend Migration](#phase-5-frontend-migration)
9. [Phase 6: Real-Time Updates](#phase-6-real-time-updates)
10. [Phase 7: PWA & Offline](#phase-7-pwa--offline)
11. [Phase 8: Deployment](#phase-8-deployment)
12. [New Web-Only Features](#new-web-only-features)
13. [File Structure](#file-structure)
14. [API Endpoint Reference](#api-endpoint-reference)
15. [Prisma Schema Reference](#prisma-schema-reference)

---

## Current Architecture

```
┌─────────────────────────────────────────┐
│  Tauri Shell (Rust)                     │
│  ┌───────────────────────────────────┐  │
│  │  Next.js Frontend (React/TS)      │  │
│  │  - 28 screens                     │  │
│  │  - 9 Zustand stores              │  │
│  │  - Components                     │  │
│  └──────────────┬────────────────────┘  │
│                 │ invoke() IPC          │
│  ┌──────────────▼────────────────────┐  │
│  │  Rust Backend (db.rs)             │  │
│  │  - 134 Tauri commands             │  │
│  │  - SQLite (rusqlite)              │  │
│  │  - 28 tables                      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Current Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src-tauri/src/db.rs` | All SQLite operations + seed data | ~6000 |
| `src-tauri/src/main.rs` | Tauri command registrations | ~1300 |
| `lib/db.ts` | TypeScript invoke wrappers | ~1560 |
| `lib/stores/*.ts` | 9 Zustand stores | ~1000 |
| `components/*.tsx` | 28 screen components | ~8000 |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser / PWA                                          │
│  ┌───────────────────────────────────┐                  │
│  │  Next.js Frontend (React/TS)      │                  │
│  │  - Same 28 screens                │                  │
│  │  - Same 9 Zustand stores          │                  │
│  │  - Same components                │                  │
│  └──────────────┬────────────────────┘                  │
│                 │ fetch() / WebSocket                   │
│  ┌──────────────▼────────────────────┐                  │
│  │  Next.js API Routes (TypeScript)  │                  │
│  │  - 134 REST endpoints             │                  │
│  │  - JWT auth middleware            │                  │
│  │  - Rate limiting                  │                  │
│  │  - Input validation               │                  │
│  └──────────────┬────────────────────┘                  │
│                 │ Prisma ORM                            │
│  ┌──────────────▼────────────────────┐                  │
│  │  PostgreSQL (Neon)                │                  │
│  │  - 28 tables                      │                  │
│  │  - Cloud-hosted, auto-backup      │                  │
│  └───────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Package |
|-------|-----------|---------|
| Frontend | Next.js 16 (App Router) | `next@16` |
| State | Zustand | `zustand` (already using) |
| Styling | Tailwind CSS | `tailwindcss` (already using) |
| Icons | Lucide React | `lucide-react` (already using) |
| Database | PostgreSQL | Neon / Supabase |
| ORM | Prisma | `prisma` + `@prisma/client` |
| Auth | NextAuth.js | `next-auth` |
| Validation | Zod | `zod` |
| Real-time | Socket.io | `socket.io` + `socket.io-client` |
| File Upload | Cloudinary | `cloudinary` + `next-cloudinary` |
| Email | Resend | `resend` |
| SMS | Twilio | `twilio` (already integrated) |
| Payments | Stripe / Razorpay | `stripe` / `razorpay` |
| PWA | next-pwa | `next-pwa` |
| Rate Limit | Upstash Redis | `@upstash/ratelimit` |
| Deployment | Vercel | — |

---

## Phase 1: Database Setup

### 1.1 Install Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

### 1.2 Create Prisma Schema

Create `prisma/schema.prisma` with all 28 tables:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id        String   @id @default(uuid())
  name      String
  price     Float
  category  String   @default("General")
  stock     Int      @default(0)
  barcode   String   @default("")
  tax       Float    @default(18)
  variants  Json?
  createdAt DateTime @default(now())

  orderItems  OrderItem[]
  recipes     Recipe[]
  inventoryAlerts InventoryAlert[]

  @@index([category])
  @@index([barcode])
  @@map("products")
}

model Order {
  id              String   @id @default(uuid())
  subtotal        Float
  taxAmount       Float
  discountAmount  Float   @default(0)
  total           Float
  paymentMethod   String
  amountPaid      Float
  changeAmount    Float   @default(0)
  customerName    String  @default("")
  status          String  @default("completed")
  orderType       String  @default("dine_in")
  deliveryStatus  String  @default("pending")
  deliveryAddress String  @default("")
  deliveryPhone   String  @default("")
  userId          String  @default("")
  userName        String  @default("")
  synced          Boolean @default(false)
  createdAt       DateTime @default(now())

  items     OrderItem[]
  modifiers OrderModifier[]
  notes     OrderNote[]
  refunds   RefundRequest[]

  @@index([createdAt])
  @@index([status])
  @@index([userId])
  @@index([customerName])
  @@map("orders")
}

model OrderItem {
  id          Int     @id @default(autoincrement())
  orderId     String
  productId   String
  productName String
  price       Float
  quantity    Int
  discount    Float   @default(0)
  tax         Float   @default(18)

  order     Order      @relation(fields: [orderId], references: [id])
  modifiers OrderModifier[]

  @@index([orderId])
  @@map("order_items")
}

// ... (continue for all 28 tables)
// See Prisma Schema Reference section below
```

### 1.3 Full Tables to Migrate

| # | Table | Purpose |
|---|-------|---------|
| 1 | `products` | Product catalog |
| 2 | `orders` | Order headers |
| 3 | `order_items` | Order line items |
| 4 | `settings` | App configuration (key-value) |
| 5 | `users` | Staff accounts |
| 6 | `activity_logs` | Audit trail |
| 7 | `tables` | Restaurant tables |
| 8 | `table_orders` | Table-order mapping |
| 9 | `staff_attendance` | Clock in/out |
| 10 | `customers` | Customer database |
| 11 | `order_modifiers` | Item modifiers |
| 12 | `order_notes` | Internal order notes |
| 13 | `inventory_alerts` | Low stock alerts |
| 14 | `refund_requests` | Refund approval queue |
| 15 | `ingredients` | Raw materials |
| 16 | `recipes` | Product-ingredient mapping |
| 17 | `suppliers` | Supplier database |
| 18 | `purchase_orders` | Procurement orders |
| 19 | `purchase_order_items` | PO line items |
| 20 | `reservations` | Table bookings |
| 21 | `shifts` | Staff scheduling |
| 22 | `expenses` | Expense tracking |
| 23 | `expense_categories` | Expense types |
| 24 | `customer_wallets` | Wallet balances |
| 25 | `wallet_transactions` | Wallet history |
| 26 | `coupons` | Discount codes |
| 27 | `day_end_reconciliations` | Daily cash balancing |
| 28 | `quick_sale_presets` | Quick sale combos |
| 29 | `cash_drawer_sessions` | Cash drawer open/close |
| 30 | `receipt_templates` | Custom receipt layouts |

### 1.4 Run Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

### 1.5 Seed Data

Create `prisma/seed.ts` — port all seed functions from `db.rs`:

- 24 products
- 10 tables
- 2 users (admin: 1234, cashier: 0000)
- 10 customers
- 24 ingredients
- 47 recipes
- 5 suppliers
- 10 expense categories
- 8 coupons
- 8 shifts
- 8 reservations
- 5 quick sale presets
- 1 receipt template

---

## Phase 2: Authentication

### 2.1 Install NextAuth.js

```bash
npm install next-auth @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

### 2.2 Auth Configuration

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "PIN",
      credentials: {
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.pin) return null;

        const user = await prisma.user.findFirst({
          where: { pin: await bcrypt.hash(credentials.pin, 10) },
        });

        // Or compare hashed PIN
        // const match = await bcrypt.compare(credentials.pin, user.pin);

        if (user) {
          return { id: user.id, name: user.name, role: user.role };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
```

### 2.3 Auth Middleware

Create `middleware.ts`:

```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/((?!login|api/auth|_next|favicon.ico).*)"],
};
```

### 2.4 Admin Role Guard

Create `lib/auth.ts`:

```typescript
import { getServerSession } from "next-auth";

export async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
```

---

## Phase 3: Core API Routes

### 3.1 API Route Structure

```
app/api/
├── auth/
│   └── [...nextauth]/route.ts      # NextAuth
├── products/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [id]/route.ts               # GET, PUT, DELETE
├── orders/
│   ├── route.ts                    # GET (list/filter), POST (create)
│   ├── [id]/route.ts               # GET, PUT
│   ├── [id]/refund/route.ts        # POST
│   ├── [id]/cancel/route.ts        # POST
│   ├── [id]/notes/route.ts         # GET, POST
│   └── hold/route.ts               # POST
├── settings/
│   └── route.ts                    # GET, PUT
├── dashboard/
│   ├── summary/route.ts            # GET
│   ├── weekly/route.ts             # GET
│   ├── top-products/route.ts       # GET
│   ├── low-stock/route.ts          # GET
│   ├── hourly/route.ts             # GET
│   └── staff-performance/route.ts  # GET
└── ...
```

### 3.2 Example: Products API

Create `app/api/products/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  category: z.string().default("General"),
  stock: z.number().int().min(0).default(0),
  barcode: z.string().default(""),
  tax: z.number().min(0).max(100).default(18),
  variants: z.any().optional(),
});

export async function GET() {
  await requireAuth();
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = await request.json();
  const data = productSchema.parse(body);

  const product = await prisma.product.create({ data });

  await prisma.activityLog.create({
    data: {
      orderId: "",
      action: "product_created",
      newData: JSON.stringify(product),
      reason: "New product added",
      userId: session.user.id!,
      userName: session.user.name!,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
```

### 3.3 Example: Orders API

Create `app/api/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "100");

  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = await request.json();

  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        subtotal: body.subtotal,
        taxAmount: body.tax_amount,
        discountAmount: body.discount_amount || 0,
        total: body.total,
        paymentMethod: body.payment_method,
        amountPaid: body.amount_paid,
        changeAmount: body.change_amount || 0,
        customerName: body.customer_name || "",
        status: "completed",
        orderType: body.order_type || "dine_in",
        deliveryStatus: body.order_type === "delivery" ? "pending" : "delivered",
        deliveryAddress: body.delivery_address || "",
        deliveryPhone: body.delivery_phone || "",
        userId: session.user.id!,
        userName: session.user.name!,
      },
    });

    // Create order items and deduct stock
    for (const item of body.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.product_id,
          productName: item.product_name,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount || 0,
          tax: item.tax || 18,
        },
      });

      await tx.product.update({
        where: { id: item.product_id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newOrder;
  });

  return NextResponse.json(order, { status: 201 });
}
```

---

## Phase 4: Feature API Routes

### Complete Endpoint List

```
AUTH
  POST   /api/auth/[...nextauth]         NextAuth handler

PRODUCTS
  GET    /api/products                   List all
  POST   /api/products                   Create
  GET    /api/products/[id]              Get one
  PUT    /api/products/[id]              Update
  DELETE /api/products/[id]              Delete
  PUT    /api/products/[id]/stock        Update stock

ORDERS
  GET    /api/orders                     List (with filters)
  POST   /api/orders                     Create
  GET    /api/orders/[id]                Get one with items
  PUT    /api/orders/[id]                Update
  POST   /api/orders/[id]/refund         Refund
  POST   /api/orders/[id]/cancel         Cancel
  GET    /api/orders/[id]/notes          Get notes
  POST   /api/orders/[id]/notes          Add note
  POST   /api/orders/hold                Hold order
  GET    /api/orders/held                Get held orders
  GET    /api/orders/pending-count       Pending count
  DELETE /api/orders/pending/[id]        Delete pending

SETTINGS
  GET    /api/settings                   Get all
  PUT    /api/settings                   Update

TABLES
  GET    /api/tables                     List
  POST   /api/tables                     Create
  PUT    /api/tables/[id]                Update
  DELETE /api/tables/[id]                Delete
  PUT    /api/tables/[id]/status         Update status

CUSTOMERS
  GET    /api/customers                  List
  POST   /api/customers                  Create
  GET    /api/customers/[id]             Get one
  PUT    /api/customers/[id]             Update
  GET    /api/customers/phone/[phone]    Lookup by phone
  GET    /api/customers/[id]/orders      Order history
  POST   /api/customers/[id]/loyalty     Add points

WALLET
  GET    /api/wallet/[customerId]        Get balance
  POST   /api/wallet/[customerId]/load   Load money
  POST   /api/wallet/[customerId]/pay    Deduct payment
  GET    /api/wallet/[customerId]/txns   Transactions

COUPONS
  GET    /api/coupons                    List
  POST   /api/coupons                    Create
  PUT    /api/coupons/[id]               Update
  DELETE /api/coupons/[id]               Delete
  POST   /api/coupons/validate           Validate code
  POST   /api/coupons/[id]/use           Mark as used

STAFF
  GET    /api/staff                      List users
  POST   /api/staff/clock-in             Clock in
  POST   /api/staff/clock-out            Clock out
  GET    /api/staff/attendance           Today's attendance
  GET    /api/staff/schedule             Get shifts
  POST   /api/staff/schedule             Create shift
  PUT    /api/staff/schedule/[id]        Update shift
  DELETE /api/staff/schedule/[id]        Delete shift

EXPENSES
  GET    /api/expenses                   List
  POST   /api/expenses                   Create
  DELETE /api/expenses/[id]              Delete
  GET    /api/expenses/categories        List categories
  POST   /api/expenses/categories        Create category

INGREDIENTS
  GET    /api/ingredients                List
  POST   /api/ingredients                Create
  PUT    /api/ingredients/[id]           Update
  DELETE /api/ingredients/[id]           Delete

RECIPES
  GET    /api/recipes                    List
  POST   /api/recipes                    Create

SUPPLIERS
  GET    /api/suppliers                  List
  POST   /api/suppliers                  Create
  PUT    /api/suppliers/[id]             Update
  DELETE /api/suppliers/[id]             Delete

PURCHASE ORDERS
  GET    /api/purchase-orders            List
  POST   /api/purchase-orders            Create
  PUT    /api/purchase-orders/[id]/status Update status
  POST   /api/purchase-orders/[id]/receive Receive

RESERVATIONS
  GET    /api/reservations               List (by date)
  POST   /api/reservations               Create
  PUT    /api/reservations/[id]          Update
  DELETE /api/reservations/[id]          Delete

KDS
  GET    /api/kds/orders                 Get pending orders
  POST   /api/kds/orders/[id]/done       Mark done

REFUNDS
  GET    /api/refunds                    List
  POST   /api/refunds                    Create request
  POST   /api/refunds/[id]/approve       Approve
  POST   /api/refunds/[id]/reject        Reject

CASH DRAWER
  GET    /api/cash-drawer/[date]         Get session
  POST   /api/cash-drawer/open           Open drawer
  POST   /api/cash-drawer/close          Close drawer

QUICK SALE
  GET    /api/quick-sale                 List presets
  POST   /api/quick-sale                 Create
  DELETE /api/quick-sale/[id]            Delete

RECEIPT TEMPLATES
  GET    /api/receipt-templates          List
  POST   /api/receipt-templates          Create
  PUT    /api/receipt-templates/[id]     Update
  DELETE /api/receipt-templates/[id]     Delete

BULK OPERATIONS
  POST   /api/bulk/stock                 Bulk update stock
  POST   /api/bulk/price                 Bulk update price
  POST   /api/bulk/tax                   Bulk update tax

REPORTS
  GET    /api/reports/daily              Daily summary
  GET    /api/reports/range              Date range
  GET    /api/reports/hourly             Hourly sales
  GET    /api/reports/staff              Staff performance
  GET    /api/reports/items              Sales by item
  GET    /api/reports/gstr1              GSTR-1
  GET    /api/reports/gstr3b             GSTR-3B

DAY END
  GET    /api/day-end/[date]             Get reconciliation
  POST   /api/day-end                    Save reconciliation

ACTIVITY LOGS
  GET    /api/logs                       List (paginated)

INVENTORY ALERTS
  GET    /api/alerts                     List
  POST   /api/alerts/check               Check stock levels
  DELETE /api/alerts/[id]                Clear alert

BACKUP
  POST   /api/backup/export              Export all data
  POST   /api/backup/import              Import data
  GET    /api/backup/counts              Table counts
  POST   /api/backup/csv/products        Export products CSV
  POST   /api/backup/csv/orders          Export orders CSV
  POST   /api/backup/csv/import          Import CSV

NOTIFICATIONS
  POST   /api/notifications/email        Send email
  POST   /api/notifications/sms          Send SMS
  POST   /api/notifications/whatsapp     Send WhatsApp
```

**Total: ~134 endpoints**

---

## Phase 5: Frontend Migration

### 5.1 Replace `lib/db.ts`

The key change: replace `invoke()` calls with `fetch()` calls.

**Before (Tauri):**
```typescript
export async function dbGetProducts(): Promise<Product[]> {
  return invoke<Product[]>("get_products");
}
```

**After (Web):**
```typescript
export async function dbGetProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}
```

### 5.2 Full `lib/db.ts` Replacement Strategy

Create a new `lib/api.ts` that replaces the `sql()` function:

```typescript
// lib/api.ts — replaces the invoke/sql pattern

async function api<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Products
export const getProducts = () => api<Product[]>("/products");
export const createProduct = (data: Partial<Product>) =>
  api<Product>("/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id: string, data: Partial<Product>) =>
  api<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id: string) =>
  api<void>(`/products/${id}`, { method: "DELETE" });

// Orders
export const getOrders = (filters?: { status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  return api<Order[]>(`/orders?${params}`);
};
export const createOrder = (order: NewOrder) =>
  api<Order>("/orders", { method: "POST", body: JSON.stringify(order) });

// ... etc for all 134 functions
```

### 5.3 Files to Change

| File | Change |
|------|--------|
| `lib/db.ts` | Replace `invoke` with `fetch` (or create new `lib/api.ts`) |
| `lib/stores/authStore.ts` | Use NextAuth `signIn()` instead of `verifyPin()` |
| `lib/stores/*.ts` | Update imports from `db.ts` to `api.ts` |
| `app/layout.tsx` | Add `SessionProvider` from NextAuth |
| `app/page.tsx` | Use NextAuth session check instead of local auth |
| `components/LoginScreen.tsx` | Use `signIn("credentials", { pin })` |

### 5.4 Files That Stay the Same

All 28 screen components — they call store actions, not `invoke` directly:

- `POSScreen.tsx` ✅ No changes needed
- `OrdersScreen.tsx` ✅ No changes needed
- `ProductsScreen.tsx` ✅ No changes needed
- `DashboardScreen.tsx` ✅ No changes needed
- All other screens ✅ No changes needed

### 5.5 Auth Store Update

```typescript
// lib/stores/authStore.ts — Web version
import { signIn, signOut, useSession } from "next-auth/react";

export const useAuthStore = create<AuthState>()((set) => ({
  // ... existing state

  login: async (pin: string) => {
    const result = await signIn("credentials", {
      pin,
      redirect: false,
    });
    if (result?.ok) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: async () => {
    await signOut({ redirect: false });
    set({ isAuthenticated: false, user: null });
  },
}));
```

---

## Phase 6: Real-Time Updates

### 6.1 Install Socket.io

```bash
npm install socket.io socket.io-client
```

### 6.2 Socket Server

Create `lib/socket.ts`:

```typescript
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export function initSocket(res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join-kds", () => socket.join("kds"));
      socket.on("join-dashboard", () => socket.join("dashboard"));

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }
  return res.socket.server.io;
}
```

### 6.3 Emit Events from API Routes

```typescript
// In POST /api/orders
const io = res.socket.server.io;
io?.to("kds").emit("new-order", order);
io?.to("dashboard").emit("order-created", { total: order.total });
```

### 6.4 Listen in Frontend

```typescript
// hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const socket = useRef<Socket>();

  useEffect(() => {
    socket.current = io();
    return () => { socket.current?.disconnect(); };
  }, []);

  return socket.current;
}

// In KDSScreen.tsx
const socket = useSocket();
useEffect(() => {
  socket?.emit("join-kds");
  socket?.on("new-order", (order) => {
    setOrders((prev) => [order, ...prev]);
  });
}, [socket]);
```

---

## Phase 7: PWA & Offline

### 7.1 Install next-pwa

```bash
npm install next-pwa
```

### 7.2 Configure PWA

Create `next.config.js`:

```javascript
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});

module.exports = withPWA({
  // existing config
});
```

### 7.3 Web App Manifest

Create `public/manifest.json`:

```json
{
  "name": "POS Billing",
  "short_name": "POS",
  "description": "Restaurant Point of Sale System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0D0F",
  "theme_color": "#F5C842",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 7.4 Offline Queue

Create `lib/offlineQueue.ts`:

```typescript
const QUEUE_KEY = "pos_offline_queue";

interface QueuedAction {
  id: string;
  endpoint: string;
  method: string;
  body: any;
  timestamp: number;
}

export function addToQueue(action: Omit<QueuedAction, "id" | "timestamp">) {
  const queue = getQueue();
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): QueuedAction[] {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
}

export async function syncQueue() {
  const queue = getQueue();
  const successful: string[] = [];

  for (const action of queue) {
    try {
      await fetch(action.endpoint, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      successful.push(action.id);
    } catch {
      // Leave in queue for retry
    }
  }

  const remaining = queue.filter((a) => !successful.includes(a.id));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

// Auto-sync when back online
if (typeof window !== "undefined") {
  window.addEventListener("online", syncQueue);
}
```

---

## Phase 8: Deployment

### 8.1 Environment Variables

Create `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-key-here"

# Twilio (existing)
TWILIO_SID=your_sid
TWILIO_TOKEN=your_token
TWILIO_PHONE=your_phone

# Cloudinary (for file uploads)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Resend (for emails)
RESEND_API_KEY=re_xxxxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_xxxxx
```

### 8.2 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
```

### 8.3 Vercel Configuration

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "regions": ["bom1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 8.4 Neon Database Setup

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set as `DATABASE_URL` in Vercel

### 8.5 Build Commands

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:push": "prisma db push"
  },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

---

## New Web-Only Features

Features possible only with a web deployment:

| Feature | Description |
|---------|-------------|
| **Multi-branch** | Central DB, branch_id on orders/products, per-branch reports |
| **Online ordering** | Customer-facing menu page, place orders online |
| **QR code ordering** | Table QR codes → order from phone |
| **Payment gateway** | Stripe/Razorpay for card/UPI payments |
| **Multi-device sync** | Same POS on tablet + phone + desktop |
| **2FA authentication** | TOTP/SMS verification for admin |
| **API integrations** | Zomato, Swiggy, accounting software |
| **Customer portal** | Customers view order history, loyalty points |
| **Email receipts** | Auto-send receipt to customer email |
| **Scheduled reports** | Daily/weekly email reports |
| **Webhook support** | Notify external systems on orders |
| **Multi-currency** | Support multiple currencies |
| **Inventory forecasting** | AI-based stock prediction |

---

## File Structure (Web)

```
pos-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     # POS screen (same)
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── features/
│   │   └── page.tsx                 # Public features page
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       ├── products/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── stock/route.ts
│       ├── orders/
│       │   ├── route.ts
│       │   ├── [id]/
│       │   │   ├── route.ts
│       │   │   ├── refund/route.ts
│       │   │   ├── cancel/route.ts
│       │   │   └── notes/route.ts
│       │   ├── hold/route.ts
│       │   └── held/route.ts
│       ├── settings/route.ts
│       ├── tables/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── status/route.ts
│       ├── customers/
│       │   ├── route.ts
│       │   ├── [id]/
│       │   └── phone/[phone]/route.ts
│       ├── wallet/[customerId]/
│       ├── coupons/
│       ├── staff/
│       ├── expenses/
│       ├── ingredients/
│       ├── recipes/
│       ├── suppliers/
│       ├── purchase-orders/
│       ├── reservations/
│       ├── kds/
│       ├── refunds/
│       ├── cash-drawer/
│       ├── quick-sale/
│       ├── receipt-templates/
│       ├── bulk/
│       ├── reports/
│       ├── day-end/
│       ├── logs/
│       ├── alerts/
│       ├── backup/
│       └── notifications/
├── components/                      # Same 28 screens (unchanged)
│   ├── POSScreen.tsx
│   ├── OrdersScreen.tsx
│   ├── ProductsScreen.tsx
│   └── ... (all existing components)
├── lib/
│   ├── api.ts                       # NEW: fetch-based API client
│   ├── auth.ts                      # NEW: auth helpers
│   ├── prisma.ts                    # NEW: Prisma client singleton
│   ├── socket.ts                    # NEW: Socket.io setup
│   ├── offlineQueue.ts              # NEW: offline sync queue
│   ├── db.ts                        # KEEP: types/interfaces only
│   ├── keyboard.ts                  # KEEP: keyboard shortcuts
│   ├── storeTypes.ts                # KEEP: store type configs
│   └── stores/                      # KEEP: Zustand stores
│       ├── authStore.ts             # UPDATE: use NextAuth
│       ├── cartStore.ts             # KEEP
│       ├── productsStore.ts         # UPDATE: use api.ts
│       ├── ordersStore.ts           # UPDATE: use api.ts
│       └── ... (all stores)
├── prisma/
│   ├── schema.prisma                # NEW: full DB schema
│   └── seed.ts                      # NEW: seed data
├── public/
│   ├── manifest.json                # NEW: PWA manifest
│   ├── icon-192.png                 # NEW: PWA icon
│   └── icon-512.png                 # NEW: PWA icon
├── middleware.ts                     # NEW: auth middleware
├── next.config.js                   # UPDATE: add PWA config
├── .env                             # NEW: environment vars
├── vercel.json                      # NEW: deployment config
└── package.json                     # UPDATE: add dependencies
```

---

## Migration Checklist

- [ ] Create new branch `feat/web-migration`
- [ ] Install Prisma, NextAuth, Zod, Socket.io, next-pwa
- [ ] Create `prisma/schema.prisma` with all 30 tables
- [ ] Run `prisma migrate dev` to create database
- [ ] Create `prisma/seed.ts` with all seed data
- [ ] Create `lib/prisma.ts` singleton
- [ ] Create `app/api/auth/[...nextauth]/route.ts`
- [ ] Create `middleware.ts` for auth
- [ ] Create API routes for Products (test with Postman)
- [ ] Create API routes for Orders (test with Postman)
- [ ] Create API routes for Settings
- [ ] Create API routes for remaining 25 tables
- [ ] Create `lib/api.ts` — fetch-based API client
- [ ] Update `lib/db.ts` — keep types, remove invoke calls
- [ ] Update `lib/stores/authStore.ts` — use NextAuth
- [ ] Update `lib/stores/productsStore.ts` — use api.ts
- [ ] Update `lib/stores/ordersStore.ts` — use api.ts
- [ ] Update remaining stores
- [ ] Update `components/LoginScreen.tsx` — use signIn()
- [ ] Test all 28 screens with new API
- [ ] Add Socket.io for real-time KDS updates
- [ ] Add Socket.io for dashboard live stats
- [ ] Configure PWA (manifest, service worker)
- [ ] Add offline queue for failed requests
- [ ] Set up Neon PostgreSQL database
- [ ] Set up Vercel project
- [ ] Configure environment variables
- [ ] Deploy to Vercel
- [ ] Test production deployment
- [ ] Set up custom domain (optional)
- [ ] Set up SSL (automatic with Vercel)

---

## Estimated Timeline

| Phase | Tasks | Days |
|-------|-------|------|
| 1. Database | Prisma schema + seed | 1 |
| 2. Auth | NextAuth + JWT + middleware | 1 |
| 3. Core API | Products, Orders, Settings | 2 |
| 4. Feature APIs | All remaining endpoints | 3 |
| 5. Frontend | Update db.ts + stores | 1 |
| 6. Real-time | Socket.io integration | 1 |
| 7. PWA | Offline + manifest | 1 |
| 8. Deploy | Vercel + Neon setup | 1 |
| **Total** | | **~11 days** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| API route performance | Use connection pooling (Neon), add caching |
| Large payload size | Paginate orders, lazy load products |
| Offline reliability | Service worker + localStorage queue |
| Auth security | httpOnly cookies, rate limiting, HTTPS only |
| Data migration | Export from SQLite → import to PostgreSQL |
| Breaking changes | Keep Tauri version in separate branch |

---

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Neon PostgreSQL](https://neon.tech/docs)
- [Socket.io with Next.js](https://socket.io/how-to/use-with-nextjs)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
- [Vercel Deployment](https://vercel.com/docs)

---

*Last updated: 2026-03-21*
*App version: 1.0.0*
*Total API endpoints: 134*
*Total DB tables: 30*
*Total components: 28*
