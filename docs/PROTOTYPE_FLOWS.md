# Zeni prototype: how users, agents & admins work together (Kenya)

This doc describes the working prototype so **users**, **agents**, and **admins** in Kenya can collaborate end-to-end.

---

## 1. Roles and entry points

| Role   | Login / Register        | Portal        | Main use |
|--------|-------------------------|---------------|----------|
| **User**  | `/login`, `/register` (role: user)   | `/app/*`      | Find properties, message agents, request viewings |
| **Agent** | `/login`, `/agentlogin`, register as agent | `/agent/*`    | Add listings, manage leads, chat with users |
| **Admin** | `/login`, `/adminlogin` (admin domain) | `/admin/*`    | Verify agents & listings, manage users, messages |

---

## 2. User flow (Kenya)

1. **Register** as user → land on **Dashboard** (`/app/home`).
2. **Explore** (`/app/explore`) or **Inventory** (`/app/inventory`) → browse listings (filters, map).
3. **Open a listing** → see details; **Message agent** or **Request viewing**.
4. **Messages** (`/app/messages`):
   - **Zeni Support** and **Zeni Agent** are always available (created on first open if empty).
   - Conversations about a **specific listing** show that listing in the chat (card at top of thread) and go to the listing’s agent (or Zeni Agent).
5. **Saved** (`/app/saved`) – saved searches; **Viewings** – requested viewings.
6. **Profile** (`/app/profile`) – **Verify my identity (KYC)**: upload ID document for admin verification; status (pending/verified/rejected) and submitted docs shown. Required for some payouts/compliance.

**Outcome:** User finds a property, talks to the right agent (or Zeni Agent), sees the listing in the same chat, and can submit KYC from Profile.

---

## 3. Agent flow (Kenya)

1. **Register** as agent → status is **pending** until admin approves.
2. **Verification** (`/agent/verification`) – upload **agent** evidence (ID/license) and EARB number; optionally **Business verification** (company/entity documents). Wait for admin.
3. **Admin approves** (see Admin flow) → agent becomes **verified** (and business verified if submitted).
4. **Listings** (`/agent/listings`) – create/edit listings. New listings go to **pending_review**.
5. **Admin approves listing** (see Admin flow) → listing goes **live** and appears in Explore/Inventory.
6. **Dashboard** & **Leads** – see conversations with users (excluding Zeni Support chats).
7. **Messages** (`/agent/messages`) – reply to users; thread shows the listing in chat.
8. **Viewings** – manage viewing requests.

**Outcome:** Agent gets verified, lists properties, and handles leads and viewings in one place.

---

## 4. Admin flow (Kenya)

1. **Login** as admin (e.g. `/adminlogin`) → land on **Moderation Queue** (`/admin/verification`).
2. **Moderation Queue** – Single table with:
   - **Agent Verify**: pending agents (evidence + EARB); **Approve** / **Reject**; expand row for EARB link and evidence.
   - **New Listing**: pending listings; **Approve** / **Reject** (same as Listings review).
   - **KYC Verify**: users who submitted identity docs (Profile → Verify my identity); **Approve** / **Reject**; expand for evidence.
   - **Business Verify**: agents who submitted business/company docs (Agent → Verification → Business verification); **Approve** / **Reject**; expand for evidence.
   Step-up may be required for resolve actions.
3. **Listings** (`/admin/listings`) – Full listings review; **Message** agent if needed.
4. **Users** (`/admin/users`) – view users, suspend/ban, delete.
5. **Overview** – dashboard stats; **Reports** – export; **Audit** – audit log.
6. **Messages** (`/admin/messages`) – e.g. Zeni Support conversations with users.

**Outcome:** Admin keeps the marketplace safe via one Moderation Queue (agents, listings, KYC, business) and user/listings management.

---

## 5. How they work together

```
User                    Agent                     Admin
  |                        |                         |
  |  Explore/Inventory     |                         |
  |  → Listing detail     |                         |
  |  → Message agent ─────┼──→ Conversation        |
  |  (listing in chat)     |  ←── Replies            |
  |                        |                         |
  |                        |  New listing            |
  |                        |  (pending_review) ──────┼──→ Listings review
  |                        |  ←── Approved ──────────|    (Approve/Reject)
  |  Listing goes live    |                         |
  |  ←────────────────────|                         |
  |                        |                         |
  |                        |  Register (pending) ────┼──→ Verification
  |                        |  ←── Approved ──────────|    (Agents queue)
  |                        |  Verified agent         |
```

- **Users** get listings (and support) and talk to **agents** (or Zeni Agent) with the **listing visible in chat**.
- **Agents** get **verified** by admin, then add **listings** that admin **approves**; then they receive **leads** and **messages**.
- **Admins** **verify agents** and **listings**, and manage **users** and **reports**.

---

## 6. Run the prototype (Kenya)

1. **Environment**  
   - Backend: `server/.env` with at least `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`.  
   - For Kenya/Zeni: `ADMIN_EMAIL=admin@zeni.test`, `ZENI_AGENT_EMAIL=agent@zeni.test`; `ZENI_SUPPORT_EMAIL` as needed.

2. **Seed**  
   From `server/`:  
   `npm run seed`  
   This creates:
   - Admin (admin@zeni.test), Zeni Support, Zeni Agent (agent@zeni.test), pending agent, basic user.
   - Sample live + pending listings (Nairobi; listings = properties). No support/help “listing” — those chats have no listing.
   - Sample conversation (user ↔ Zeni Agent for a listing).

3. **Start**  
   - API: `cd server && npm run dev`  
   - App: `npm run dev`  
   Use seeded emails and `SEED_PASSWORD` (default `ChangeMe123!`) to log in as user, agent, or admin.

4. **Quick test**  
   - **User:** Log in as basic user → Explore/Inventory → open listing → Message agent → open Messages and see listing in thread.  
   - **Agent:** Log in as Zeni Agent → Messages → reply; Listings → edit.  
   - **Admin:** Log in as admin → Verification (approve pending agent) → Listings (approve/reject pending listing).

---

## 7. Kenya-specific notes

- **Zeni Agent** is the main in-app agent (`agent@zeni.test`); users can message them from Messages or from a listing. **Admin** is `admin@zeni.test` for now.
- **Zeni Support** is for account/help; both Support and Agent appear in user Messages by default.
- **Currency** in seed is **KES**; listings use Nairobi locations.
- **M-Pesa** and **Pay** are configured via env (see `server/src/config/env.ts` and pay docs) for payments when you enable them.

This gives you a single reference for how users, agents, and admins work together in the Kenya prototype.

---

## 8. Not yet / To finish

Use this list to close the gap from “almost” to “done”:

- [ ] **One full pass** – Log in as user → explore → message from a listing → open Messages; then as agent reply; then as admin check Verification + Listings. Fix anything that breaks or feels wrong.
- [ ] **Env for Kenya** – Set `ADMIN_EMAIL`, `ZENI_AGENT_EMAIL`, `ZENI_SUPPORT_EMAIL` (and optional `SEED_PASSWORD`) in `server/.env`; run `npm run seed` so DB matches.
- [ ] **Clear “done” criteria** – Decide what “prototype done” means for you (e.g. “all three roles can do their main flow without errors,” or “we can demo to X by date Y”) and tick those off.
- [ ] **Anything you’re unhappy with** – Note specific screens, flows, or copy that still feel off so we can fix them next.

**Code-level gaps** (see **`docs/GAPS.md`** for full list): message attachments (placeholder), Pay Profile email/phone/password (now documented in UI), social login Facebook/Twitter (coming soon). Testing and release checklist is in `docs/test-plan.md` and `docs/GAPS.md`.
