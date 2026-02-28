# Zeni Real Estate Platform

A full-stack web application for property listings, viewings, messaging, and payments—built for the Kenyan market. Zeni provides verified listings, map-first search, real-time chat, viewing fees, and a separate Pay portal for secure transactions.

---

## Table of Contents

- [Description](#description)
- [Key Features](#key-features)
- [Recent Improvements](#recent-improvements)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Hybrid (Capacitor)](#hybrid-capacitor)
- [Features Overview](#features-overview)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Code Structure](#code-structure)

---

## Description

**Zeni** is a MERN-stack (MongoDB, Express, React, Node.js) real estate platform that connects buyers, renters, agents, and admins in Kenya. The app includes:

- **Public:** Marketing landing page, public map, listing details, login/register, password reset
- **User portal:** Explore listings, save searches, request viewings, message agents, profile & KYC, refund requests
- **Agent portal:** Dashboard, listings management, leads, viewings, analytics, verification, boost
- **Admin portal:** User/listings moderation, verification queue (agents, listings, KYC, business), reports, audit, network access
- **Pay portal:** Secure payment console (viewing fees, payouts) with separate JWT audience

---

## Key Features

- **Landing page** — Zeni branding, scroll-spy nav, orange accent styling, newsletter signup, FAQ, contact
- **Map-first search** — Public and in-app maps (Leaflet), draw zones, filter by price/type
- **Fuzzy search** — Typo-tolerant location suggestions (fuse.js); "Kilimnai" → Kilimani; commute-hub suggestions ("Near CBD", "Near Westlands")
- **Verified listings** — Admin-approved listings and agents; 3-state verification badge (Verified / Unverified / Pending)
- **Image gallery + lightbox** — Multi-image scroll, thumbnail strip, full-screen lightbox with keyboard navigation (←/→/Esc)
- **WhatsApp CTA** — Deep-link "Chat on WhatsApp" on listing detail + sticky mobile bar
- **Neighbourhood trust block** — Safety / water reliability / power / parking / service charge notes for 11 Kenya areas (Kilimani, Westlands, Karen, Lavington, Runda, Parklands, Upper Hill, CBD, Kasarani, Ruaka, Ngong Road)
- **Report listing** — Modal with category picker (Scam, Bait pricing, Duplicate, etc.) wired to backend API
- **Real-time messaging** — Socket.IO chat with agents; Zeni Support and listing context in threads
- **Viewing requests** — Request viewings; optional viewing fee (e.g. 500 KES) held until completion
- **Recently viewed** — Last 6 viewed listings persisted to localStorage; horizontal strip above search results
- **Compare listings** — Select 2–3 listings → side-by-side comparison table (price, beds, baths, area, location, verified)
- **Save search** — Save current filters/query; accessible from Saved section
- **Neighbourhood SEO pages** — `/rent/kilimani`, `/buy/westlands`, etc. with descriptions, live listings, FAQs, and JSON-LD
- **Pay portal** — Stripe and bank transfer; viewing fees, refund requests (Zeni Shield), invoices
- **Agent verification** — EARB, ID, business docs; admin moderation queue
- **KYC (users)** — Profile → Verify identity; admin approves/rejects
- **PWA** — Web app manifest and service worker; "Add to Home Screen"; offline cached saved listings
- **SEO** — Open Graph, Twitter Card meta, JSON-LD RealEstateListing structured data per listing page
- **LQIP images** — Blur-up placeholders via Cloudinary 32px thumbnails (eliminates CLS flash)
- **Analytics (optional)** — Event tracking endpoint for search, viewing, payment, refund events

---

## Recent Improvements (March 2026)

### Imagery
| Improvement | Detail |
|---|---|
| Kenyan fallback photos | Curated Nairobi/Westlands/Karen exteriors/interiors are used as placeholders while listings load or when agents haven’t uploaded media yet. Agent-uploaded photos (after admin approval) automatically override the fallbacks. |

### Search UX
| Improvement | Detail |
|---|---|
| Fuzzy matching | `fuse.js` on location suggestions — typo-tolerant (threshold 0.45) |
| Commute hubs | "Near CBD", "Near Westlands", "Near Upper Hill", etc. in suggestion dropdown |
| KES presets | 6 price bands matching Kenya rental reality: <30K / 30–50K / 50–80K / 80–120K / 120–200K / 200K+ |
| Save search | Bookmark icon in toolbar → named saves stored via API |
| Rich filter callback | `onFilter(filters)` passes actual values to consumers |

### Listing Detail Page
| Improvement | Detail |
|---|---|
| Image gallery | Thumbnail strip, animated slide transitions, LQIP blur placeholders |
| Lightbox | Full-screen, ←/→/Escape keyboard nav, dimmed backdrop |
| WhatsApp CTA | Green button → `wa.me/{phone}?text=...` deep-link (sidebar + sticky mobile bar) |
| Trust strip | 3-state: Verified (green) / Unverified (amber) / Pending + "Updated X days ago" |
| Neighbourhood trust | Safety/water/power/parking/service-charge notes for 11 Kenya areas |
| Report modal | Category picker + optional message → `POST /api/listings/:id/report` |
| Share button | `navigator.share()` → WhatsApp fallback on desktop |
| Signup UX | Clear messaging for duplicate accounts (409/USER_EXISTS) and validation hints so users know to log in instead of re-registering. |

### Conversion
| Improvement | Detail |
|---|---|
| Recently viewed | localStorage hook (`useRecentlyViewed`), shown as horizontal chip strip on Explore |
| Compare | Toggle on each card (max 3), side-by-side table modal |

### SEO
| Improvement | Detail |
|---|---|
| Twitter Cards | `twitter:card`, `twitter:title`, `twitter:image` — critical for WA link previews |
| JSON-LD | `RealEstateListing` structured data injected per listing page |
| Neighbourhood pages | `/rent/:neighborhood` and `/buy/:neighborhood` with live listings, FAQs, schema |

---

## Technologies Used

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router 6, Tailwind CSS, GSAP, Lenis, Framer Motion, Leaflet (react-leaflet), Socket.IO client, Stripe.js, Zod, **fuse.js** |
| **Backend** | Node.js, Express, TypeScript, MongoDB (Mongoose), JWT, Socket.IO, Stripe, Nodemailer, bcryptjs, Helmet, express-rate-limit |
| **Media** | Cloudinary (WebP/AVIF transforms, LQIP auto, responsive widths) |
| **Dev/Test** | Vitest, Playwright, ESLint, Prettier, Husky, lint-staged |
| **Deploy** | Docker (optional), PM2, Vite build (static + gzip/brotli), Vercel |

---

## Installation

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (or yarn/pnpm)
- **MongoDB** 6+ (local or remote; e.g. MongoDB Atlas)
- **Git**

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ZENI
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Configure frontend environment**
   ```bash
   copy .env.example .env   # Windows
   # cp .env.example .env   # macOS / Linux
   ```
   Edit `.env` and set at least:
   - `VITE_API_BASE_URL` (e.g. `/api` for same-origin)
   - `VITE_DEV_API_TARGET` (e.g. `http://localhost:4000`) if using Vite proxy

4. **Install and configure the server**
   ```bash
   cd server
   npm install
   copy .env.example .env   # Windows
   cd ..
   ```
   In `server/.env` set:
   - `PORT` (e.g. `4000`)
   - `MONGO_URI` (your MongoDB connection string)
   - `JWT_SECRET` (strong random string for production)
   - `CORS_ORIGIN` (e.g. `http://localhost:5173,capacitor://localhost` for dev/native shells)

5. **Seed demo data (optional)**
   ```bash
   npm run seed
   ```
   Default seed password: `SEED_PASSWORD` or `ChangeMe123!` (see server seed script).

---

## Basic Usage

### Run the full stack (frontend + backend)

```bash
npm run dev:full
```

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:4000**

### Run frontend and backend separately

Terminal 1 (backend):
```bash
npm run dev:server
```

Terminal 2 (frontend):
```bash
npm run dev
```

### Production build

```bash
npm run build
```
Output: `dist/` (static assets). Serve with any static host; API must be deployed separately (e.g. `npm run build:server` then PM2 or Docker).

### Quality checks

| Command | Description |
|---|---|
| `npm run lint` | Frontend ESLint |
| `npm run build` | Frontend production build |
| `npm run test` | Frontend unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run lint:server` | Backend ESLint |
| `npm run build:server` | Backend TypeScript build |
| `npm run test:server` | Backend Jest tests |

---

## Hybrid (Capacitor)

Capacitor 8 wraps the existing Vite build so the same codebase ships to Android and iOS. Native platform folders are generated locally and gitignored by default.

### Prerequisites
- Android Studio (2024.3+), Android SDK Platform 34+, Java 17
- Xcode 15+ and CocoaPods (for iOS)
- Backend reachable over HTTPS (or `http://10.0.2.2` to hit a host-running API from the Android emulator)

### Configure
1. Set `VITE_MOBILE_API_BASE_URL` to a full HTTPS origin. Relative `/api` will not work once the app runs inside a native webview.
2. (Optional) Set `VITE_MOBILE_SOCKET_URL` if Socket.IO uses a different origin.
3. Keep `CORS_ORIGIN` containing `capacitor://localhost` and your API origin (already reflected in `server/.env.example`).
4. For live reload, point the shell at your dev server: export `CAP_SERVER_URL=http://<LAN_IP>:5173` before running the mobile commands, and run `npm run dev:mobile` so the server binds to your LAN IP.

### Commands
- `npm run mobile:sync` — build web assets and run `npx cap sync` (preps `android/` + `ios/`).
- `npx cap add android` / `npx cap add ios` — one-time native scaffolding.
- `npm run mobile:android` — build, sync, and open Android Studio.
- `npm run mobile:ios` — build, sync, and open Xcode.
- `npm run mobile:doctor` — sanity-check Capacitor + native toolchains.
- Live reload on device/emulator: `npm run dev:mobile` (binds Vite to LAN) then `CAP_SERVER_URL=http://<LAN_IP>:5173 npm run mobile:android` (or `mobile:ios`). Clear `CAP_SERVER_URL` for production builds.

### Deployment tips
- Use HTTPS API endpoints in production to avoid mixed content; Android allows HTTP only for local dev (see `capacitor.config.ts`).
- After any web change, rerun `npm run mobile:sync` before generating signed `.aab` / `.ipa`.

---

## Features Overview

| Area | Features |
|---|---|
| **Public** | Zeni landing (`/`), public map (`/map`), listing detail (`/listing/:id`), neighbourhood pages (`/rent/:n`, `/buy/:n`), login, register, forgot/reset password |
| **User** | Home, Explore (fuzzy search, compare, save search, recently viewed), Inventory, Saved, Viewings, Messages, Profile (KYC), Refunds |
| **Agent** | Dashboard, Listings (CRUD), Boost, Leads, Viewings, Analytics, Verification, Settings |
| **Admin** | Overview, Verification (agents/listings/KYC/business), Listings, Users, Reports, Audit, Network access, Refund requests, Settings |
| **Pay** | Login, Dashboard, Payments, Invoices, History, Profile, Receipt (separate JWT `aud=pay`) |

Detailed flows: **`docs/PROTOTYPE_FLOWS.md`** and **`docs/HOW_IT_WORKS.md`**.

---

## Configuration

### Frontend (`.env`)

| `VITE_MOBILE_API_BASE_URL` | API origin used inside Capacitor (must be full HTTPS) | fallback to `VITE_API_BASE_URL` |
| `VITE_SOCKET_URL` | Socket.IO URL (optional) | same as API origin |
| `VITE_MOBILE_SOCKET_URL` | Socket origin for Capacitor builds (optional) | fallback to `VITE_SOCKET_URL` |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In Web client ID | - |
| `VITE_SENTRY_DSN` | Sentry DSN (production) | - |
| `VITE_ANALYTICS_ENDPOINT` | Analytics POST URL | - |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | - |
| `VITE_CONTACT_EMAIL` | Contact email (footer/landing) | `zeniapp.ke@gmail.com` |
| `VITE_CONTACT_PHONE` | Contact phone (optional) | - |
| `VITE_SOCIAL_*` | Instagram, LinkedIn, Twitter URLs | - |

### Backend (`server/.env`)

See **`server/.env.example`**. Key variables: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `VIEWING_FEE_AMOUNT`, admin/pay step-up codes, M-Pesa, SMTP, Stripe, and optional network controls (`ADMIN_IP_ALLOWLIST`, Tailscale, etc.). Production requires non-default secrets and explicit `MONGO_URI` / `CORS_ORIGIN`.

---

## Troubleshooting

| Issue | What to try |
|---|---|
| **`npm install` fails (Windows EBUSY/EPERM)** | Close IDEs/terminals/antivirus; delete `node_modules` and `package-lock.json`, then `npm install` again. |
| **Frontend build: "Cannot find module"** | Run `npm install`; ensure all dependencies (e.g. `@sentry/react`, `vite-plugin-compression2`, `fuse.js`) are installed. |
| **Backend tests fail (e.g. viewing 400)** | Viewing requests require the requested date to be at least 24 hours in the future (EAT). Adjust seed or test payloads. |
| **Port already in use** | Change `PORT` in `server/.env` or run Vite on another port: `npm run dev -- --port 5174`. |
| **MongoDB connection refused** | Start MongoDB locally or set `MONGO_URI` to a running instance (e.g. Docker: `docker run -d -p 27017:27017 mongo`). |
| **Pay/refunds not matching user** | Pay portal must use the same user id as the main app so refund-eligible transactions are correctly linked. |

More: **`docs/DEPLOYMENT_CHECKLIST.md`**, **`docs/DEPLOY.md`**, **`docs/SECURITY.md`**.

---

## Contributing

1. **Fork** the repository and create a branch from `main`.
2. **Follow** existing code style (ESLint + Prettier); run `npm run lint` and `npm run format:check`.
3. **Test** your changes: `npm run test` and, if touching flows, `npm run test:e2e`.
4. **Commit** with clear messages; hooks will run lint-staged.
5. **Open a Pull Request** with a short description of the change and any related issue.

---

## License

This project is private. All rights reserved. See the repository or a `LICENSE` file in the repo for exact terms.

---

## Code Structure

### Frontend (`src/`)

```
src/
├── App.tsx                 # Root app, error boundary, providers, route progress
├── main.tsx                # Entry point, React root
├── routes/
│   └── index.tsx           # Route definitions (public, /app, /agent, /admin, /pay, /rent/:n, /buy/:n)
├── pages/                  # Route-level pages
│   ├── ZeniLanding.tsx     # Landing page
│   ├── PublicMap.tsx       # Public map
│   ├── PropertyDetails.tsx # Listing detail (gallery, WhatsApp CTA, trust block, report, share)
│   ├── NeighborhoodPage.tsx # SEO neighbourhood pages (/rent/:n, /buy/:n)
│   ├── NotFound.tsx
│   ├── auth/               # Login, Register, ForgotPassword, ResetPassword
│   ├── user/               # Home, Explore, Inventory, Saved, Viewings, Profile, Refunds
│   │   └── Explore.tsx     # Fuzzy search, compare, save search, recently viewed strip
│   ├── agent/              # Dashboard, Listings, Leads, Viewings, Analytics, Verification, Settings
│   ├── admin/              # Overview, Verification, Listings, Users, Reports, Audit, Refund, Settings
│   ├── messages/           # Inbox, Thread (chat UI)
│   └── pay/                # Pay portal pages
├── layouts/
│   ├── UserLayout.tsx
│   ├── AgentLayout.tsx
│   └── AdminLayout.tsx
├── components/
│   ├── ui/                 # Button, Input, Badge, Skeleton, Sidebar, etc.
│   ├── guards/             # RequireAuth, RequireRole
│   ├── chat/               # MessageBubble, MessageComposer, ConversationItem
│   ├── listings/           # PropertyCard, FilterBar, ViewingRequestForm, drawer/*
│   │   ├── ImageGallery.tsx       # Multi-image gallery + lightbox + LQIP (NEW)
│   │   ├── NeighborhoodTrust.tsx  # Safety/water/power/parking notes (NEW)
│   │   ├── ReportListingModal.tsx # Report listing UI (NEW)
│   │   └── CompareModal.tsx       # Side-by-side listing comparison (NEW)
│   ├── landing/            # Header, Footer, SafetySection, AgentSection, FeaturedListings
│   ├── SearchBar.tsx       # Fuzzy search (fuse.js), commute hubs, KES presets
│   ├── PropertyMap.tsx
│   └── ...
├── context/                # AuthProvider, ChatContext, ToastContext, ThemeContext, NotificationContext
├── hooks/
│   ├── useRecentlyViewed.ts # localStorage recently-viewed hook (NEW)
│   ├── useListingSEO.ts    # OG + Twitter Card + JSON-LD per listing (UPGRADED)
│   ├── useDebounce.ts
│   └── ...
├── lib/
│   ├── cloudinary.ts       # listingLqipUrl(), listingDetailUrl(), listingThumbUrl() (UPGRADED)
│   └── ...
├── pay/                    # PayRouter, PayAuthContext, payApi, Pay portal
├── providers/
│   └── AppProviders.tsx
├── constants/
├── types/
└── utils/
```

### Backend (`server/src/`)

```
server/src/
├── server.ts               # HTTP server, Socket.IO, mount routes
├── app.ts                  # Express app, middleware, CORS
├── config/
│   ├── env.ts              # Load and validate env
│   ├── db.ts               # MongoDB connection
│   └── sentry.ts           # Sentry init
├── routes/                 # REST API routes
│   ├── listing.routes.ts   # Includes POST /listings/:id/report
│   ├── saved-search.routes.ts
│   ├── saved-listing.routes.ts
│   └── ...
├── controllers/
├── services/
├── models/                 # User, Listing, ViewingRequest, Message, Conversation, etc.
├── middlewares/
├── jobs/                   # savedSearchAlerts, queue
└── utils/
```

---

For frontend architecture and design patterns, see **`docs/ARCHITECTURE.md`**.
For deployment, security, and ops details, see **`docs/DEPLOY.md`**, **`docs/SECURITY.md`**, and **`ops/README.md`**.


---

## Table of Contents

- [Description](#description)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Hybrid (Capacitor)](#hybrid-capacitor)
- [Features Overview](#features-overview)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Code Structure](#code-structure)

---

## Description

**Zeni** is a MERN-stack (MongoDB, Express, React, Node.js) real estate platform that connects buyers, renters, agents, and admins in Kenya. The app includes:

- **Public:** Marketing landing page, public map, listing details, login/register, password reset
- **User portal:** Explore listings, save searches, request viewings, message agents, profile & KYC, refund requests
- **Agent portal:** Dashboard, listings management, leads, viewings, analytics, verification, boost
- **Admin portal:** User/listings moderation, verification queue (agents, listings, KYC, business), reports, audit, network access
- **Pay portal:** Secure payment console (viewing fees, payouts) with separate JWT audience

---

## Key Features

- **Landing page** — Zeni branding, scroll-spy nav, orange accent styling, newsletter signup, FAQ, contact
- **Map-first search** — Public and in-app maps (Leaflet), draw zones, filter by price/type
- **Verified listings** — Admin-approved listings and agents; verified badge on cards
- **Real-time messaging** — Socket.IO chat with agents; Zeni Support and listing context in threads
- **Viewing requests** — Request viewings; optional viewing fee (e.g. 500 KES) held until completion
- **Pay portal** — Stripe and bank transfer; viewing fees, refund requests (Zeni Shield), invoices
- **Agent verification** — EARB, ID, business docs; admin moderation queue
- **KYC (users)** — Profile → Verify identity; admin approves/rejects
- **PWA** — Web app manifest and service worker; “Add to Home Screen”; offline cached saved listings
- **Analytics (optional)** — Event tracking endpoint for search, viewing, payment, refund events

---

## Technologies Used

| Layer      | Technologies |
|-----------|--------------|
| **Frontend** | React 18, TypeScript, Vite, React Router 6, Tailwind CSS, GSAP, Lenis, Framer Motion, Leaflet (react-leaflet), Socket.IO client, Stripe.js, Zod |
| **Backend**  | Node.js, Express, TypeScript, MongoDB (Mongoose), JWT, Socket.IO, Stripe, Nodemailer, bcryptjs, Helmet, express-rate-limit |
| **Dev/Test** | Vitest, Playwright, ESLint, Prettier, Husky, lint-staged |
| **Deploy**   | Docker (optional), PM2, Vite build (static + gzip/brotli) |

---

## Installation

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (or yarn/pnpm)
- **MongoDB** 6+ (local or remote; e.g. MongoDB Atlas)
- **Git**

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "FINAL PROJECT"
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Configure frontend environment**
   ```bash
   copy .env.example .env   # Windows
   # cp .env.example .env   # macOS / Linux
   ```
   Edit `.env` and set at least:
   - `VITE_API_BASE_URL` (e.g. `/api` for same-origin)
   - `VITE_DEV_API_TARGET` (e.g. `http://localhost:4000`) if using Vite proxy

4. **Install and configure the server**
   ```bash
   cd server
   npm install
   copy .env.example .env   # Windows
   cd ..
   ```
   In `server/.env` set:
   - `PORT` (e.g. `4000`)
   - `MONGO_URI` (your MongoDB connection string)
   - `JWT_SECRET` (strong random string for production)
   - `CORS_ORIGIN` (e.g. `http://localhost:5173,capacitor://localhost` for dev/native shells)

5. **Seed demo data (optional)**
   ```bash
   npm run seed
   ```
   Default seed password: `SEED_PASSWORD` or `ChangeMe123!` (see server seed script).

---

## Basic Usage

### Run the full stack (frontend + backend)

```bash
npm run dev:full
```

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:4000**

### Run frontend and backend separately

Terminal 1 (backend):
```bash
npm run dev:server
```

Terminal 2 (frontend):
```bash
npm run dev
```

### Production build

```bash
npm run build
```
Output: `dist/` (static assets). Serve with any static host; API must be deployed separately (e.g. `npm run build:server` then PM2 or Docker).

### Quality checks

| Command            | Description                    |
|--------------------|--------------------------------|
| `npm run lint`     | Frontend ESLint                |
| `npm run build`    | Frontend production build      |
| `npm run test`     | Frontend unit tests (Vitest)   |
| `npm run test:e2e` | E2E tests (Playwright)         |
| `npm run lint:server`  | Backend ESLint             |
| `npm run build:server` | Backend TypeScript build   |
| `npm run test:server`  | Backend Jest tests         |

---

## Features Overview

| Area        | Features |
|------------|----------|
| **Public** | Zeni landing (`/`), public map (`/map`), listing detail (`/listing/:id`), login, register, forgot/reset password |
| **User**   | Home, Explore, Inventory, Saved, Viewings, Messages, Profile (KYC), Refunds |
| **Agent**  | Dashboard, Listings (CRUD), Boost, Leads, Viewings, Analytics, Verification, Settings |
| **Admin**  | Overview, Verification (agents/listings/KYC/business), Listings, Users, Reports, Audit, Network access, Refund requests, Settings |
| **Pay**    | Login, Dashboard, Payments, Invoices, History, Profile, Receipt (separate JWT `aud=pay`) |

Detailed flows: **`docs/PROTOTYPE_FLOWS.md`** and **`docs/HOW_IT_WORKS.md`**.

---

## Configuration

### Frontend (`.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | API path or full origin | `/api` |
| `VITE_DEV_API_TARGET` | Proxy target in dev | `http://localhost:4000` |
| `VITE_MOBILE_API_BASE_URL` | API origin used inside Capacitor (must be full HTTPS) | fallback to `VITE_API_BASE_URL` |
| `VITE_SOCKET_URL` | Socket.IO URL (optional) | same as API origin |
| `VITE_MOBILE_SOCKET_URL` | Socket origin for Capacitor builds (optional) | fallback to `VITE_SOCKET_URL` |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In Web client ID | - |
| `VITE_SENTRY_DSN` | Sentry DSN (production) | - |
| `VITE_ANALYTICS_ENDPOINT` | Analytics POST URL | - |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | - |
| `VITE_CONTACT_EMAIL` | Contact email (footer/landing) | `zeniapp.ke@gmail.com` |
| `VITE_CONTACT_PHONE` | Contact phone (optional) | - |
| `VITE_SOCIAL_*` | Instagram, LinkedIn, Twitter URLs | - |

### Backend (`server/.env`)

See **`server/.env.example`**. Key variables: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `VIEWING_FEE_AMOUNT`, admin/pay step-up codes, M-Pesa, SMTP, Stripe, and optional network controls (`ADMIN_IP_ALLOWLIST`, Tailscale, etc.). Production requires non-default secrets and explicit `MONGO_URI` / `CORS_ORIGIN`.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **`npm install` fails (Windows EBUSY/EPERM)** | Close IDEs/terminals/antivirus; delete `node_modules` and `package-lock.json`, then `npm install` again. |
| **Frontend build: "Cannot find module"** | Run `npm install`; ensure all dependencies (e.g. `@sentry/react`, `vite-plugin-compression2`) are installed. |
| **Backend tests fail (e.g. viewing 400)** | Viewing requests require the requested date to be at least 24 hours in the future (EAT). Adjust seed or test payloads. |
| **Port already in use** | Change `PORT` in `server/.env` or run Vite on another port: `npm run dev -- --port 5174`. |
| **MongoDB connection refused** | Start MongoDB locally or set `MONGO_URI` to a running instance (e.g. Docker: `docker run -d -p 27017:27017 mongo`). |
| **Pay/refunds not matching user** | Pay portal must use the same user id as the main app so refund-eligible transactions are correctly linked. |

More: **`docs/DEPLOYMENT_CHECKLIST.md`**, **`docs/DEPLOY.md`**, **`docs/SECURITY.md`**.

---

## Contributing

1. **Fork** the repository and create a branch from `main`.
2. **Follow** existing code style (ESLint + Prettier); run `npm run lint` and `npm run format:check`.
3. **Test** your changes: `npm run test` and, if touching flows, `npm run test:e2e`.
4. **Commit** with clear messages; hooks will run lint-staged.
5. **Open a Pull Request** with a short description of the change and any related issue.

---

## License

This project is private. All rights reserved. See the repository or a `LICENSE` file in the repo for exact terms.

---

## Code Structure

### Frontend (`src/`)

```
src/
├── App.tsx                 # Root app, error boundary, providers, route progress
├── main.tsx                # Entry point, React root
├── routes/
│   └── index.tsx           # Route definitions (public, /app, /agent, /admin, /pay)
├── pages/                  # Route-level pages
│   ├── ZeniLanding.tsx     # Landing page (hero, map, projects, insights, FAQ, CTA)
│   ├── PublicMap.tsx       # Public map
│   ├── PropertyDetails.tsx  # Listing detail
│   ├── NotFound.tsx
│   ├── auth/               # Login, Register, ForgotPassword, ResetPassword
│   ├── user/               # Home, Explore, Inventory, Saved, Viewings, Profile, Refunds
│   ├── user/home/          # Hero, widgets, activity feed
│   ├── agent/              # Dashboard, Listings, Leads, Viewings, Analytics, Verification, Settings
│   ├── admin/              # Overview, Verification, Listings, Users, Reports, Audit, RefundRequests, Settings
│   ├── messages/           # Inbox, Thread (chat UI)
│   └── pay/                # Pay portal pages (Dashboard, Payments, Invoices, etc.)
├── layouts/
│   ├── UserLayout.tsx      # App shell for /app/*
│   ├── AgentLayout.tsx     # App shell for /agent/*
│   └── AdminLayout.tsx     # App shell for /admin/*
├── components/             # Reusable UI and feature components
│   ├── ui/                 # Button, Input, Badge, Skeleton, Sidebar, etc.
│   ├── guards/             # RequireAuth, RequireRole
│   ├── chat/               # MessageBubble, MessageComposer, ConversationItem
│   ├── listings/           # PropertyCard, FilterBar, ViewingRequestForm, drawer/*
│   ├── landing/            # Header, Footer, SafetySection, AgentSection, FeaturedListings
│   ├── admin/              # AdminStepUpModal
│   ├── ErrorBoundary.tsx
│   ├── PropertyMap.tsx
│   └── ...
├── context/                # AuthProvider, ChatContext, ToastContext, ThemeContext, NotificationContext
├── hooks/                  # useMotion, useKineticRing, useCursor, useDebounce, useChatSocket, etc.
├── lib/                    # API client, auth, chat, validation, format, analytics, socket
├── pay/                    # PayRouter, PayAuthContext, payApi, Pay portal pages/components
├── providers/
│   └── AppProviders.tsx    # Wraps app with all contexts
├── constants/              # listings, messages, verification
├── types/                  # landing, chat, API types
└── utils/                  # cn, mockData, etc.
```

### Backend (`server/src/`)

```
server/src/
├── server.ts               # HTTP server, Socket.IO, mount routes
├── app.ts                 # Express app, middleware, CORS
├── config/
│   ├── env.ts              # Load and validate env
│   ├── db.ts               # MongoDB connection
│   └── sentry.ts           # Sentry init
├── routes/                 # REST API routes
│   ├── index.ts            # Mounts all route modules
│   ├── auth.routes.ts
│   ├── listing.routes.ts
│   ├── user.routes.ts
│   ├── agent.routes.ts
│   ├── admin.routes.ts
│   ├── chat.routes.ts
│   ├── viewing.routes.ts
│   ├── viewing.agent.routes.ts
│   ├── pay.routes.ts
│   ├── pay.portal.routes.ts
│   ├── refundRequest.routes.ts
│   ├── notification.routes.ts
│   ├── health.routes.ts
│   ├── upload.routes.ts
│   ├── recommendation.routes.ts
│   ├── saved-search.routes.ts
│   ├── saved-listing.routes.ts
│   └── ...
├── controllers/            # Request handlers (auth, listing, user, chat, viewing, pay, admin, etc.)
├── services/               # Business logic (auth, listing, viewing, chat, stripe, notification, etc.)
├── models/                 # Mongoose models (User, Listing, ViewingRequest, Message, Conversation, etc.)
├── middlewares/            # auth, rbac, rateLimit, errorHandler, adminStepUp, payAuth, ipAllowlist
├── jobs/                   # Cron/scheduled (savedSearchAlerts, queue)
└── utils/                  # validators, audit, payStateMachine, totp, etc.
```

---

For frontend architecture, design patterns, and gradual refactoring, see **`docs/ARCHITECTURE.md`**.  
For deployment, security, and ops details, see **`docs/DEPLOY.md`**, **`docs/SECURITY.md`**, and **`ops/README.md`**.
