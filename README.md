# IT Inventory Management & Help Desk Ticketing System

A full-stack, role-based IT asset inventory and help-desk ticketing platform.

**Stack:** React + MUI (frontend) · Node.js/Express + MongoDB/Mongoose (backend) · JWT auth with refresh-token rotation · Socket.IO real-time notifications.

---

## 1. What's included and fully working

- **Org hierarchy**: Company → Office → Department → User. Set up under "Company & Offices" (admin). Every office has a `location`, and that location is **automatically applied** to any inventory item registered against a purchase made for that office — nobody types a location by hand.
- **Auth & RBAC**: JWT access + httpOnly refresh-token rotation, bcrypt hashing, 3 roles (`admin`, `manager`, `user`) enforced on every route.
- **Google Workspace sign-in**: "Sign in with Google" auto-creates an account on first login (default role `user`, no department) — no manual account creation needed beforehand. An admin then assigns the real role/department from the Users page. Optionally restrict sign-in to your company's Workspace domain only (see Setup below). Existing local (email/password) accounts can also sign in with Google if the emails match — the accounts get linked automatically.
- **Inventory lifecycle**: Categories → Purchases (tied to an Office) → individual serialized units → Issue / Return / Transfer / Repair / Lost / Reserved / Scrap, each write producing an **immutable** `InventoryHistory` timeline entry (nothing is ever hard-deleted). Deleting a purchase cascades to its registered serial numbers (soft-deleted, history preserved) — blocked if any of them are currently issued.
- **Ticket workflow**: Create → Manager Approve/Reject → Admin Assign → Issue Item (linked to ticket) → Resolve → Close → **Reopen** (re-enters the fulfillment queue — admin can issue a replacement item or resolve directly, it doesn't dead-end at "close only"), with comments and file attachments. Issuing an item **always** requires an approved ticket — there's no bypass path from the Inventory screen.
- **Dashboard**: role-scoped — admins see full org-wide stats + charts; managers see ticket counts plus their **own** issued items separately from their **team's** issued items; regular users see their own tickets and issued items only. Every admin stat card is clickable and routes to the filtered underlying screen.
- **Global search & filters** across assets, tickets, users, vendors.
- **Reports** (admin only): Excel / CSV / PDF export, downloaded through an authenticated request (not a raw link, since the login token can't travel via a plain `<a href>`).
- **Data Import** (admin only): CSV/XLSX migration tooling for Vendors, Item Categories, Purchases, Users, and Inventory serial numbers — each processed row-by-row with a report of what succeeded/failed, safe to re-run.
- **QR code generation** per asset, encoding company, asset tag, category, brand/model, serial number, location, and item ID — not just a random hash.
- **Email notifications** (Nodemailer) with the exact "Item Issued" template from the spec, plus return/status templates — all logged to `EmailLog`.
- **Real-time notifications** via Socket.IO (ticket updates, approvals, issuance) + persisted `Notification` documents and an in-app bell/panel.
- **Audit log** of every sensitive write action, viewable by admins.
- **Security**: helmet, CORS, rate limiting (tighter on `/auth/login`), mongo-sanitize, xss-clean, hpp, input validation (express-validator), soft deletes everywhere records shouldn't vanish.
- **UI**: MUI corporate theme, light/dark mode, responsive sidebar/navbar, breadcrumbs, notification panel, DataGrid tables with filtering/sorting/pagination.

## 2. What's scaffolded as an extension point (not fully built out)

Given the size of the original spec, a few "nice-to-have" items are wired for but intentionally left thin so the core system stays reviewable:

- **Barcode/QR *scanning*** (camera-based) — QR *generation* is implemented; wiring a scanner (e.g. `html5-qrcode`) to the existing issue/return endpoints is a small follow-up.
- **Configurable email templates** — templates live in one place (`services/emailService.js`) ready to move to a DB-backed template editor.
- **Warranty expiry reminder cron** — `warrantyExpiry` is tracked on every item; a scheduled job (e.g. `node-cron`) to notify before expiry isn't included but is a ~20-line addition given the existing notification service.

**Setup order matters**: Company → Offices → Departments → Vendors/Categories → Purchases → Serial Numbers. The seed script creates one of each so you have a working baseline; add more from the "Company & Offices" and "Departments" pages to match your real org structure before recording real purchases.

## 3. Project layout

```
itsm/
├── backend/          Express API (controllers/routes/models/services/middlewares/validators)
└── frontend/          React app (pages/components/layouts/contexts/hooks/api)
```

Backend follows clean layering: **routes → middlewares (auth/RBAC/validation) → controllers → services (email/audit/history/notifications) → models**.

## 4. Setup

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env      # then edit MONGO_URI, JWT secrets, SMTP creds
npm install
npm run seed               # creates default admin + item categories + a sample vendor
npm run dev                 # starts on http://localhost:5000
```

Default admin login after seeding: **admin@company.com / Admin@12345** — change this password immediately after first login.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # starts on http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`, so no CORS config is needed locally.

### Google Workspace sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (Application type: **Web application**).
2. Under **Authorized JavaScript origins**, add every URL the frontend will be served from, e.g. `http://localhost:5173` and your production domain. No redirect URI is needed — this uses Google Identity Services' token flow, not a server-side redirect.
3. Copy the Client ID into **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID`
4. Optional: set `GOOGLE_WORKSPACE_DOMAIN` in `backend/.env` to your company's domain (e.g. `10xengineers.com`) to block sign-in from personal Gmail accounts and only allow your Workspace users.
5. Restart both servers. A "Sign in with Google" button appears on the login page automatically once `VITE_GOOGLE_CLIENT_ID` is set — leave it unset to hide the button and use email/password only.

First-time Google sign-in auto-creates the account with the default `user` role and no department assigned; go to **Users** as an admin to assign the real role/department afterward.

### Production build (local)

```bash
cd frontend && npm run build   # outputs static files to frontend/dist
```

## 5. Deploying: Vercel (frontend) + Render (backend)

**Why two services?** Vercel is built for static sites and short-lived serverless functions. This
backend uses Socket.IO (persistent WebSocket connections) and writes ticket attachments to local
disk — neither works reliably on Vercel's serverless model. Render (or Railway/Fly.io) runs a
normal long-lived Node process, which this app is built for. The frontend, being a static Vite
build, deploys to Vercel with zero issues.

> **Known limitation**: ticket attachments are stored on local disk. Render's free-tier disk is
> ephemeral — uploaded files are lost on redeploy/restart. Fine for testing; for real production
> use, swap `middlewares/upload.js` to write to S3/Cloudinary instead (the multer setup is
> already isolated there, so this is a contained change).

### Step 1 — MongoDB Atlas
Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas). Under **Network
Access**, allow `0.0.0.0/0` (Render's free tier doesn't have a fixed outbound IP). Copy the
connection string for `MONGO_URI`.

### Step 2 — Backend on Render
1. Push this repo to GitHub.
2. In Render: **New → Web Service** → connect the repo. If prompted, it'll pick up
   `backend/render.yaml` automatically; otherwise set manually:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add environment variables (see `backend/.env.example` for the full list) — at minimum:
   `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, and `CLIENT_URL`
   (you'll fill this in after Step 3, once you know your Vercel URL).
4. Deploy. Note the resulting URL, e.g. `https://itsm-backend.onrender.com`.
5. Run the seed script once via Render's shell tab: `npm run seed`.

### Step 3 — Frontend on Vercel
1. In Vercel: **New Project** → import the same GitHub repo.
2. Set **Root Directory** to `frontend` (this is a monorepo — Vercel needs to know where the
   Vite app lives).
3. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (Vercel
   usually detects these automatically).
4. Add environment variables:
   - `VITE_API_URL` = `https://itsm-backend.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://itsm-backend.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = (same Client ID as the backend's `GOOGLE_CLIENT_ID`, if using Google sign-in)
5. Deploy. Note your Vercel URL, e.g. `https://itsm.vercel.app`.

### Step 4 — Close the loop
Go back to Render and set `CLIENT_URL=https://itsm.vercel.app` (comma-separate multiple values if
you also want to allow a Vercel preview URL or `localhost` for continued local testing). Redeploy
the backend so the new CORS setting takes effect.

If using Google sign-in, also add `https://itsm.vercel.app` to the OAuth Client's **Authorized
JavaScript origins** in Google Cloud Console — otherwise Google will reject the sign-in request
from your live domain even though it worked locally.

Log in at your Vercel URL with the seeded admin (`admin@company.com` / `Admin@12345`) and change
that password immediately.

## 6. Key design decisions

- **Append-only history**: `InventoryHistory` and `AuditLog` are never updated or deleted from the application layer — every asset has a complete, tamper-evident timeline.
- **Soft deletes**: Users, purchases, inventory items, and tickets use an `isDeleted` flag rather than physical deletion, per the spec.
- **Refresh token rotation**: each refresh call issues a new refresh token and invalidates the old one (hash stored server-side), reducing replay risk.
- **Role scoping is enforced server-side** (not just hidden in the UI) — e.g., a manager's ticket/user queries are always filtered to their department at the controller level.
- **Cross-domain cookies**: the refresh-token cookie uses `SameSite=None; Secure` in production since the frontend (Vercel) and backend (Render) are on different domains — this only works over HTTPS, which both platforms provide by default.

## 7. API reference

All endpoints are under `/api`. Auth: `Authorization: Bearer <accessToken>` header (access token refreshed transparently via httpOnly cookie). Representative endpoints:

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/change-password` |
| Users | `GET/POST /users`, `PATCH /users/:id`, `PATCH /users/:id/disable`, `POST /users/:id/reset-password` |
| Inventory | `GET/POST /inventory/items`, `POST /inventory/items/issue`, `POST /inventory/items/return`, `POST /inventory/items/:id/transfer`, `POST /inventory/items/:id/scrap`, `GET /inventory/items/:id/qrcode`, `POST /inventory/items/bulk-import`, `GET /inventory/items/bulk-export` |
| Purchases | `GET/POST /purchases` |
| Tickets | `GET/POST /tickets`, `PATCH /tickets/:id/approve\|reject\|assign\|resolve\|close\|reopen`, `GET/POST /tickets/:id/comments` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/charts` |
| Reports | `GET /reports/:type?format=excel\|csv\|pdf` |
| Search | `GET /search?q=` |

Full request/response contracts are documented inline as JSDoc-style comments above each controller function.
