# LaptopFlip - Project Documentation & Development Handover

> **Version:** 1.6.1  
> **Last Updated:** $(date -u +"%Y-%m-%d %H:%M UTC")  
> **Source:** https://github.com/Soft-Dynamix/LaptopFlip  
> **Organisation:** Soft Dynamix

---

## 1. PROJECT OVERVIEW

### What is LaptopFlip?
LaptopFlip is an **AI-powered laptop resale toolkit** designed for South African laptop resellers. It provides end-to-end functionality for:
- **Inventory Management** — Track laptops with detailed specs, photos, conditions, and stock IDs
- **AI Ad Generation** — Generate persuasive, platform-specific advertisements for Facebook, WhatsApp, Gumtree, and OLX using either cloud AI (z-ai-web-dev-sdk) or on-device LLM (HuggingFace Qwen3-0.6B)
- **Facebook Integration** — Connect Facebook accounts, post to pages/groups/marketplace, track post insights
- **Sales Pipeline** — Visual Kanban-style sales tracking (Draft → Listed → Contacted → Negotiating → Sold)
- **CRM** — Track buyer contacts, enquiries, and communication status
- **Analytics Dashboard** — Revenue, profit margins, inventory value, best sellers, stale listing alerts
- **Mobile-First UI** — Progressive Web App with Capacitor Android APK support for offline use

### Target Market
- **Primary:** South African laptop resellers
- **Currency:** Default ZAR (South African Rand), also supports USD, GBP, EUR
- **Platforms:** Facebook Marketplace, WhatsApp, Gumtree, OLX
- **Tone:** "Honest Hustler" persona — South African slang (bru, ja, lekker, now now)

---

## 2. TECHNOLOGY STACK

### Core Framework
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.1 | App Router, React Server Components |
| React | 19.0.0 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | New York style | Component library (40+ components) |
| Lucide React | 0.525.0 | Icons |
| Framer Motion | 12.23.2 | Animations |

### Backend & Data
| Technology | Purpose |
|---|---|
| Prisma ORM | Database ORM (SQLite) |
| Next.js API Routes | REST API endpoints |
| z-ai-web-dev-sdk | Cloud AI for ad generation |
| @huggingface/transformers | On-device LLM (Qwen3-0.6B) |
| NextAuth.js v4 | Facebook authentication |
| Facebook Graph API v21.0 | Social media integration |

### State Management
| Technology | Purpose |
|---|---|
| Zustand | Client state management |
| TanStack Query | Server state / data fetching |
| localStorage | Offline persistence |

### Mobile
| Technology | Purpose |
|---|---|
| Capacitor 8 | Android APK packaging |
| @capacitor/camera | Native camera access |
| @capacitor/share | Native share sheet |
| @capacitor/haptics | Haptic feedback |

---

## 3. PROJECT STRUCTURE

```
laptopflip/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (ThemeProvider, AuthProvider, ErrorBoundary)
│   │   ├── page.tsx                # Main SPA entry (bottom nav + tab routing)
│   │   ├── globals.css             # Tailwind theme, custom CSS animations
│   │   └── api/
│   │       ├── laptops/
│   │       │   ├── route.ts        # GET all / POST create laptop
│   │       │   └── [id]/route.ts   # GET / PUT / DELETE single laptop
│   │       ├── listings/[id]/route.ts  # PUT update listing status
│   │       ├── generate-ad/route.ts   # AI ad generation (1087 lines)
│   │       ├── upload-photo/route.ts  # Photo upload (base64)
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │       └── facebook/
│   │           ├── connect/route.ts      # Initiate FB OAuth
│   │           ├── auth-callback/route.ts # Exchange token
│   │           ├── disconnect/route.ts    # Remove connection
│   │           ├── status/route.ts        # Connection status
│   │           ├── pages/route.ts         # List FB pages
│   │           ├── groups/route.ts        # List FB groups (admin only)
│   │           ├── post/route.ts          # Post to FB page/group/marketplace
│   │           ├── posts/route.ts         # List recent FB posts
│   │           └── insights/route.ts      # Post/page insights
│   ├── components/
│   │   ├── ui/                    # 40+ shadcn/ui components
│   │   ├── tabs/
│   │   │   ├── Dashboard.tsx      # Main dashboard (1440 lines)
│   │   │   ├── Inventory.tsx      # Laptop inventory list (1269 lines)
│   │   │   ├── PhotoGuide.tsx     # Photo capture guide (396 lines)
│   │   │   └── Settings.tsx       # App settings (800 lines)
│   │   ├── laptop/
│   │   │   ├── LaptopFormSheet.tsx    # Add/Edit laptop form (1393 lines)
│   │   │   ├── LaptopDetailSheet.tsx  # Laptop detail view (1156 lines)
│   │   │   └── CompareSheet.tsx       # Side-by-side compare (613 lines)
│   │   ├── ad/
│   │   │   ├── AdCreatorSheet.tsx     # Ad generation UI (804 lines)
│   │   │   └── AdPreviewSheet.tsx     # Ad preview/copy (429 lines)
│   │   ├── contacts/
│   │   │   └── ContactsSheet.tsx      # Buyer CRM (525 lines)
│   │   ├── dashboard/
│   │   │   ├── SalesAnalytics.tsx     # Sales charts (356 lines)
│   │   │   ├── SalesPipelineTracker.tsx # Kanban pipeline (231 lines)
│   │   │   └── PricingCalculator.tsx  # Price suggestion tool (496 lines)
│   │   ├── facebook/
│   │   │   ├── FacebookIntegration.tsx  # FB connection UI (1068 lines)
│   │   │   ├── FacebookPostDialog.tsx   # Post creation dialog (1190 lines)
│   │   │   └── FacebookAnalytics.tsx    # Insights display (535 lines)
│   │   ├── notifications/
│   │   │   └── NotificationCenter.tsx   # Smart notifications (349 lines)
│   │   ├── AuthProviders.tsx       # NextAuth session provider
│   │   ├── ErrorBoundary.tsx       # React error boundary
│   │   └── theme-provider.tsx      # next-themes dark mode
│   └── lib/
│       ├── db.ts                  # Prisma client singleton
│       ├── store.ts               # Zustand store (486 lines)
│       ├── types.ts               # TypeScript types & constants (206 lines)
│       ├── api.ts                 # Smart fetch wrapper (offline-first)
│       ├── local-api.ts           # localStorage fallback CRUD (719 lines)
│       ├── on-device-llm.ts       # HuggingFace LLM integration (697 lines)
│       ├── facebook-api.ts        # FB Graph API wrapper (435 lines)
│       ├── auth.ts                # NextAuth config
│       ├── hooks.ts               # TanStack Query hooks
│       ├── utils.ts               # cn() utility
│       └── photo-steps.ts         # Photo guide step definitions
├── prisma/
│   └── schema.prisma              # 4 models: Laptop, Listing, FacebookConnection, FacebookPost
├── android/                       # Capacitor Android project
├── public/                        # Static assets (logo, icons, splash)
├── mini-services/                 # (Empty) WebSocket mini services
├── skills/                        # AI skills (excluded from git)
├── .env                           # DATABASE_URL
├── Caddyfile                      # Gateway config
├── capacitor.config.ts            # Capacitor Android config
└── package.json                   # v1.6.1, 93 dependencies
```

---

## 4. DATABASE SCHEMA (Prisma/SQLite)

### Laptop Model
- **id** (cuid, primary key)
- **brand, model** (required) — Brand from POPULAR_BRANDS list or custom
- **cpu, ram, storage, gpu, screenSize** — Hardware specs
- **condition** — Mint/Excellent/Good/Fair/Poor
- **batteryHealth** — Excellent/Good/Fair/Poor
- **purchasePrice, askingPrice** — Financial tracking
- **notes, color, year, serialNumber, repairs, features** — Additional details
- **stockId** — Unique sequential ID (LF-0001, LF-0002...)
- **photos** — JSON string array of base64/URLs
- **status** — draft/active/sold/archived
- **location** — Optional location
- **relations** → has many Listing

### Listing Model
- Links a Laptop to a specific platform (facebook/whatsapp/gumtree/olx)
- Stores ad title, body, price, posting status
- **relations** → belongs to Laptop, has many FacebookPost

### FacebookConnection Model
- Stores long-lived FB access token
- Tracks user profile info and token validity

### FacebookPost Model
- Individual Facebook posts linked to a connection and optional listing
- Tracks post metrics (impressions, reach, clicks, likes, comments, shares)

---

## 5. KEY FEATURES DETAILED

### 5.1 Offline-First Architecture
The app uses a smart dual-mode system:
- **Server mode** (default web): Fetches from Next.js API routes → Prisma → SQLite
- **Local mode** (Capacitor APK / offline): Falls back to localStorage CRUD
- **Auto-detection**: Checks for Capacitor native platform, switches on server failure
- **Dual-write**: Server writes also sync to localStorage for offline access
- **Online listener**: Re-enables server mode when connectivity returns

### 5.2 AI Ad Generation (Dual Mode)
**Cloud Mode** (via z-ai-web-dev-sdk):
- Detailed platform-specific prompts (500+ words each)
- "Honest Hustler" persona with SA flavour
- Returns JSON `{title, body}` with proper spec benefits

**On-Device Mode** (via @huggingface/transformers):
- Qwen3-0.6B-ONNX model (~350MB, cached in IndexedDB)
- Downloads on first use, loads from cache subsequently
- W4 quantization, WASM device
- Same "Honest Hustler" persona
- Falls back to template-based ads if model fails

### 5.3 Facebook Integration
- OAuth flow via NextAuth.js + FB Graph API v21.0
- Token exchange: short-lived → long-lived (60 days)
- Post to: Pages, Groups (admin-only), Marketplace
- Insights: impressions, reach, clicks, likes, comments, shares
- Multi-photo post support

### 5.4 Sales Pipeline (Kanban)
- 5 stages: Draft → Listed → Contacted → Negotiating → Sold
- Visual cards grouped by stage
- Drag-and-drop not yet implemented (manual stage change)
- Persisted to localStorage

### 5.5 Dashboard Analytics
- Animated counter stats (total laptops, active, sold, revenue, profit)
- Quick Stats Strip (avg price, condition breakdowns, watched count)
- Profit Insights (best seller, avg days to sell, inventory value)
- This Week summary (listed, sold, revenue)
- Sales Pipeline Tracker (Kanban mini-view)
- Watchlist Widget (horizontal scroll)
- Recent Activity Feed
- Quick Notes (sticky notes, max 10)
- Smart Notifications (stale listings >14 days, draft reminders)

### 5.6 Inventory Management
- Search with debounce, sort (6 options), filter by status
- Status Summary Bar with animated progress bars
- Health Score badge (0-100) with animated counter and tooltip
- Quick price adjustment (+R100/-R100)
- Duplicate laptop
- WhatsApp share (native on Capacitor)
- CSV export
- Undo delete (toast with action)
- Status cycling (draft → active → sold → archived)
- Compare mode (max 2 laptops)

### 5.7 Laptop Form
- Comprehensive form with 18+ fields
- Brand autocomplete (15 popular brands + custom)
- RAM/Storage dropdown selectors
- Condition/Battery Health selectors
- Photo capture with camera (Capacitor) or file upload (web)
- Photo drag-to-reorder (@dnd-kit)
- Image preview with delete
- Auto-save detection (warn on close)

### 5.8 Settings
- Currency selector (ZAR/USD/GBP/EUR)
- Region selector (SA/Kenya/Nigeria/International)
- WhatsApp number and default location
- Facebook connect/disconnect
- App tips carousel
- Data import (JSON)
- About section

---

## 6. UI/UX DESIGN SYSTEM

### Color Palette
- **Primary:** Emerald (green) — `emerald-500` to `emerald-700`
- **Accent:** Teal for secondary actions
- **Conditions:** Emerald (Mint), Blue (Excellent), Yellow (Good), Orange (Fair), Red (Poor)
- **Statuses:** Gray (draft), Emerald (active), Blue (sold), Slate (archived)

### Animation System
- Framer Motion throughout
- Spring physics for tab switching, card entries
- Parallax scroll on Dashboard header
- Shimmer/sweep animations on stat cards and action buttons
- Floating particle effects in header
- Count-up animations for numbers
- Layout animations for filter chips and list items

### Bottom Navigation
- 5 tabs: Dashboard, Photos, Add (+), Stock, Settings
- Add button: Elevated circle with gradient, shadow, emerald glow
- Frosted glass effect (backdrop-blur-2xl)
- Active tab pill with spring animation
- iOS safe area padding

### Dark Mode
- Full dark mode support via next-themes
- oklch color system
- Careful contrast management

---

## 7. ENVIRONMENT & CONFIGURATION

### Required Environment Variables
```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXT_PUBLIC_FACEBOOK_APP_ID=     # Facebook App ID (for OAuth)
FACEBOOK_APP_SECRET=              # Facebook App Secret (for token exchange)
NEXTAUTH_SECRET=                  # NextAuth session secret
```

### Scripts
```bash
bun run dev           # Start dev server on port 3000
bun run lint          # ESLint check
bun run db:push       # Push Prisma schema to SQLite
bun run db:generate   # Generate Prisma client
bun run build         # Next.js production build
bun run start         # Start production server
bun run android:assets # Generate Android app assets
bun run cap:sync      # Sync Capacitor Android project
```

### Capacitor Config
- App ID: `com.softdynamix.laptopflip`
- Server URL configurable for dev/prod
- Android scheme: `https://localhost`

---

## 8. CURRENT PROJECT STATUS

### Completed Features (v1.6.1)
- ✅ Full CRUD for laptops with Prisma/SQLite
- ✅ Offline-first architecture (localStorage fallback)
- ✅ AI ad generation (cloud + on-device LLM)
- ✅ 4-platform ad templates (Facebook, WhatsApp, Gumtree, OLX)
- ✅ Facebook OAuth integration with Graph API
- ✅ Facebook posting (pages, groups, marketplace)
- ✅ Facebook insights tracking
- ✅ Sales pipeline Kanban tracker
- ✅ Dashboard with animated analytics
- ✅ Inventory management with search/sort/filter
- ✅ Laptop comparison (side-by-side)
- ✅ Buyer CRM (contacts management)
- ✅ Pricing calculator tool
- ✅ Notification center (smart alerts)
- ✅ Photo capture guide
- ✅ Capacitor Android APK support
- ✅ CSV export
- ✅ WhatsApp share integration
- ✅ Dark mode
- ✅ Multi-currency support

### Known Issues / Risks
- No automated tests (test directory ignored)
- `reactStrictMode: false` in next.config.ts
- `ignoreBuildErrors: true` for TypeScript
- No database migrations in use (using `db push`)
- On-device LLM model is ~350MB download
- Facebook Marketplace API requires special permissions
- Capacitor project needs Android Studio to build APK
- Photo storage is base64 in SQLite (not optimized for large volumes)
- No WebSocket/real-time features implemented yet (mini-services empty)
- Skills directory is excluded from git

---

## 9. ARCHITECTURE DECISIONS

1. **Single Page App with Tab Navigation** — No client-side routing, uses Zustand `activeTab` state
2. **Offline-First Dual-Mode** — Same API layer works for web and native Capacitor
3. **localStorage Persistence** — Settings, stages, watchlist, quick notes, contacts all persist locally
4. **Zustand over Redux** — Lighter weight, simpler API for this scale of app
5. **SQLite via Prisma** — No external database needed, zero config
6. **Framer Motion Animations** — Consistent, polished micro-interactions throughout
7. **shadcn/ui Components** — Consistent design system with Radix primitives
8. **Emerald Color Theme** — Distinctive green branding for the app
9. **No Server Actions** — All mutations via API routes (REST)
10. **Base64 Photo Storage** — Simple but not scalable; stored as JSON string in SQLite

---

*This document was generated by reviewing every source file in the repository. No guessing — all information verified from actual code.*
