# IT Inventory Management & Help Desk Ticketing System

A full-stack, role-based IT asset inventory and help-desk ticketing platform.

**Stack:** React + MUI (frontend) · Node.js/Express + MongoDB/Mongoose (backend) · JWT auth with refresh-token rotation · Socket.IO real-time notifications.

---

## 1. What's included and fully working

- **Auth & RBAC**: JWT access + httpOnly refresh-token rotation, bcrypt hashing, 3 roles (`admin`, `manager`, `user`) enforced on every route.
- **Inventory lifecycle**: Categories → Purchases → individual serialized units → Issue / Return / Transfer / Scrap / Repair, each write producing an **immutable** `InventoryHistory` timeline entry (nothing is ever hard-deleted).
- **Ticket workflow**: Create → Manager Approve/Reject → Admin Assign → Issue Item (linked to ticket) → Resolve → Close → Reopen, with comments (including admin/manager-only internal notes) and file attachments.
- **Dashboard**: live stat cards + 4 charts (monthly purchases, monthly tickets, inventory distribution, vendor stats) via MongoDB aggregation pipelines.
- **Global search & filters** across assets, tickets, users, vendors.
- **Reports**: Excel / CSV / PDF export for 5 report types.
- **Bulk import/export** of inventory via CSV/XLSX.
- **QR code generation** per asset (for printing/scanning workflows).
- **Email notifications** (Nodemailer) with the exact "Item Issued" template from the spec, plus return/status templates — all logged to `EmailLog`.
- **Real-time notifications** via Socket.IO (ticket updates, approvals, issuance) + persisted `Notification` documents and an in-app bell/panel.
- **Audit log** of every sensitive write action, viewable by admins.
- **Security**: helmet, CORS, rate limiting (tighter on `/auth/login`), mongo-sanitize, xss-clean, hpp, input validation (express-validator), soft deletes everywhere records shouldn't vanish.
- **UI**: MUI corporate theme, light/dark mode, responsive sidebar/navbar, breadcrumbs, notification panel, DataGrid tables with filtering/sorting/pagination.

## 2. What's scaffolded as an extension point (not fully built out)

Given the size of the original spec, a few "nice-to-have" items are wired for but intentionally left thin so the core system stays reviewable:

- **Barcode/QR *scanning*** (camera-based) — QR *generation* is implemented; wiring a scanner (e.g. `html5-qrcode`) to the existing issue/return endpoints is a small follow-up.
- **Multi-branch/multi-company** — the `Branch` model and `branch` fields exist on Users/Inventory, but the UI doesn't yet expose branch-switching.
- **Configurable email templates** — templates live in one place (`services/emailService.js`) ready to move to a DB-backed template editor.
- **Warranty expiry reminder cron** — `warrantyExpiry` is tracked on every item; a scheduled job (e.g. `node-cron`) to notify before expiry isn't included but is a ~20-line addition given the existing notification service.

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

### Production build

```bash
cd frontend && npm run build   # outputs static files to frontend/dist
```
Serve `frontend/dist` behind your reverse proxy (nginx, etc.) and point it at the backend API; set `CLIENT_URL` in the backend `.env` to your deployed frontend origin.

## 5. Key design decisions

- **Append-only history**: `InventoryHistory` and `AuditLog` are never updated or deleted from the application layer — every asset has a complete, tamper-evident timeline.
- **Soft deletes**: Users, purchases, inventory items, and tickets use an `isDeleted` flag rather than physical deletion, per the spec.
- **Refresh token rotation**: each refresh call issues a new refresh token and invalidates the old one (hash stored server-side), reducing replay risk.
- **Role scoping is enforced server-side** (not just hidden in the UI) — e.g., a manager's ticket/user queries are always filtered to their department at the controller level.

## 6. API reference

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
