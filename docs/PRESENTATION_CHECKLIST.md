# Presentation Checklist (Local Demo)

## Start-Up

1. Ensure MongoDB is running (default in `server/.env`: `mongodb://localhost:27017/zeni`).
2. Start backend + frontend together:

```bash
npm run dev:full
```

3. Seed demo data (creates an admin, verified agent, basic user, and sample listings):

```bash
npm run seed
```

4. Open the app:
- Frontend: `http://localhost:5173`
- Backend (health): `http://localhost:4000/api/health`

## Demo Logins (From Seed)

- Admin: `ADMIN_EMAIL` in `server/.env` (default `admin@zeni.test`)
- Agent (verified): `AGENT_EMAIL` in `server/.env` (default `agent@zeni.test`)
- User: `user-basic@zeni.test`
- Password (all seeded users): `SEED_PASSWORD` in `server/.env` (default `ChangeMe123!`)

## Smoke Tests (2-3 Minutes)

1. Public map page loads: `http://localhost:5173/map`
- Confirm the map shows markers quickly.
- Click a marker: the “Login required” card should animate in/out (no broken styling).

2. Public explore page loads: `http://localhost:5173/explore`
- Confirm listings render and navigation works.

3. Agent portal basic flow:
- Login as agent, open `http://localhost:5173/agent/listings`.
- Edit the seeded live listing.

4. Coordinates automation demo (agent listing editor):
- Go to the listing edit page (from agent listings).
- Clear **Latitude** and **Longitude**.
- Fill **City** or **Area** (e.g. `Westlands`, `Kilimani`, `Riverside`, `Karen`).
- Save draft.

Expected: the server auto-derives coordinates from City/Area when coordinates are blank, and it corrects swapped lat/lng if entered in the wrong order.

## If Something Looks “Slow”

- Refresh the page once after starting `npm run dev:full` (first load can include cold-start work).
- Keep the backend running on `PORT=4000` (from `server/.env`).
