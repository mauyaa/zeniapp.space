# Deploy Zeni (staging / production)

Get the API and frontend on a shareable URL so you can demo or test with real users.

---

## 1. Prerequisites

- **MongoDB** – Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or another host. Copy the connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/zeni?retryWrites=true&w=majority`).
- **Node.js** 18+ on your machine (for local build and env setup).

---

## 2. Backend (API)

### Option A: Railway / Render / Fly.io

1. Create a new project and connect your repo (or push the `server/` folder as the root).
2. Set **root directory** to `server` if the repo is monorepo at root.
3. **Build:** `npm install && npm run build`
4. **Start:** `npm start` (runs `node dist/server.js`)
5. **Env vars** (required):
   - `MONGO_URI` – MongoDB connection string
   - `JWT_SECRET` – Strong random string (e.g. `openssl rand -hex 32`)
   - `CORS_ORIGIN` – Your frontend URL, e.g. `https://your-app.vercel.app`
   - `NODE_ENV` – `production`
   - Optional: `ADMIN_EMAIL`, `ZENI_AGENT_EMAIL`, `ZENI_SUPPORT_EMAIL`, `SEED_PASSWORD` (see `server/.env.example`)

6. Deploy. Note the API URL (e.g. `https://your-api.railway.app`).

### Option B: VPS (e.g. Ubuntu)

```bash
cd server
npm ci --production=false
npm run build
# Use pm2 or systemd to run: node dist/server.js
# Set env in .env or systemd unit
```

---

## 3. Frontend (Vite/React)

### Option A: Vercel (recommended)

1. Import the repo in [Vercel](https://vercel.com); root = repo root (where `package.json` and `vite.config.ts` are).
2. **Build command:** `npm run build`
3. **Output directory:** `dist`
4. **Env vars** (create in Vercel dashboard):
   - `VITE_API_URL` – Your API base URL (e.g. `https://your-api.railway.app`)
5. Deploy. Vercel gives you a URL like `https://your-app.vercel.app`.

### Option B: Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add env: `VITE_API_URL` = your API URL

### Option C: Static host (S3, Cloudflare Pages, etc.)

- Run `npm run build` locally; upload the contents of `dist/`.
- Ensure `VITE_API_URL` is set at build time (e.g. in CI) so the client points to your API.

---

## 4. After first deploy

1. **Seed the database** (once) from your machine:
   ```bash
   cd server
   MONGO_URI="your-production-mongo-uri" JWT_SECRET="your-secret" CORS_ORIGIN="https://your-app.vercel.app" npm run seed
   ```
   Or run the same in a one-off job/container on your backend host.

2. **CORS:** Ensure `CORS_ORIGIN` on the API includes the exact frontend URL (no trailing slash).

3. **Test:** Open the frontend URL → log in with a seeded user (e.g. admin, Zeni Agent, basic user) and password from seed output.

4. **Checklist:** For Moderation Queue, KYC, Business Verify, and payments see `docs/DEPLOYMENT_CHECKLIST.md`.

---

## 5. Quick script: clone + env + seed (local)

For new teammates or a fresh test env:

```bash
# 1. Clone and install
git clone <repo-url> zeni && cd zeni
npm install
cd server && npm install && cd ..

# 2. Copy env (then edit with real values)
cp server/.env.example server/.env

# 3. Seed (requires MongoDB running and MONGO_URI in server/.env)
npm run seed
```

Document in your README: “See `docs/DEPLOY.md` for staging/production and `docs/PROTOTYPE_FLOWS.md` for how to run and test the prototype.”
