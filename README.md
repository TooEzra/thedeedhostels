# THE DEED HOSTELS

Rental property management for a hostel or rental business in Kenya. Tenants see their rent, receipts and
requests. Caretakers and the landlord see who has paid, who hasn't, and what needs fixing.

The project is two separate applications that talk over HTTP:

| App          | Folder      | Stack                                                          |
| ------------ | ----------- | -------------------------------------------------------------- |
| **Frontend** | `frontend/` | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts    |
| **Backend**  | `backend/`  | Node 20+, Express 4, TypeScript, MongoDB (Mongoose), Zod, jose |

The frontend contains **no database code and no secrets**. The backend contains **no UI**. The REST API is the only
contract between them, so either side can be changed, tested or deployed on its own.

## Quick start

Requires Node 20.6+ and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
# 1. Install both apps
npm run install:all            # or: (cd backend && npm i) && (cd frontend && npm i)

# 2. Configure
cp backend/.env.example  backend/.env         # set MONGODB_URI and AUTH_SECRET (openssl rand -base64 48)
cp frontend/.env.example frontend/.env.local  # BACKEND_URL=http://localhost:4000 (the default)

# 3. Demo data
npm run seed                   # refuses to run on a non-empty DB; add  -- --force  to WIPE and reseed

# 4. Run (two terminals)
npm run dev:api                # API on  http://localhost:4000
npm run dev:web                # Web on  http://localhost:3000   <- open this one
```

### Demo accounts (all use password `Deed@2026`)

| Role      | Email                          | Notes                          |
| --------- | ------------------------------ | ------------------------------ |
| Landlord  | landlord@deedhostels.co.ke     | Everything, incl. reports      |
| Caretaker | caretaker@deedhostels.co.ke    | No deletes, no reports         |
| Tenant    | wanjiku.kamau@example.com      | Paid up                        |
| Tenant    | samuel.kiprop@example.com      | Two months behind              |

Change these before using real data.

---

## Architecture

```
                        ┌──────────────────────────── Browser ────────────────────────────┐
                        │  React UI (client components) · httpOnly session cookie         │
                        └───────────────┬───────────────────────────────▲─────────────────┘
                                        │ fetch("/api/...")             │ HTML / RSC payload
                                        ▼                               │
┌────────────────────────────────────  FRONTEND  (Next.js, :3000)  ─────┴──────────────────┐
│  Server Components ── serverGet() ──┐        middleware: no cookie → /login               │
│  (pages, layouts: render with data) │        rewrites:   /api/*  →  BACKEND_URL/api/*     │
└─────────────────────────────────────┼─────────────────────────────────────────────────────┘
                                      │ HTTP + forwarded session cookie
                                      ▼
┌──────────────────────────────────  BACKEND  (Express, :4000)  ───────────────────────────┐
│  helmet · cors · json · cookie-parser · originCheck (CSRF) · attachUser (session → user)  │
│  routes/*  →  requireStaff / requireLandlord / requireTenant  →  zod validation           │
│  services/* (rent maths, queries, uploads, tickets, M-Pesa hook)  →  Mongoose models      │
└─────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                          ▼
                                MongoDB            ./uploads (ticket photos)
```

### How a request flows

1. **Reading data (Server Components).** A page such as `/admin/payments` runs on the Next.js server and calls
   `serverGet("/rent/roll?month=…")` (`frontend/src/lib/server-api.ts`). That helper forwards the visitor's session cookie
   straight to the backend and returns the `data` payload. A `401` redirects to `/login`, `403` to `/`, `404` to the
   not-found page.
2. **Changing data (client components).** Forms call `useApi()` (`frontend/src/lib/use-api.ts`), which sends
   `fetch("/api/payments", …)` to the **same origin**. `next.config.mjs` rewrites `/api/*` to the backend, so the browser never
   talks to a second origin: the session cookie is first-party and no browser CORS setup is needed. After a successful
   mutation the hook calls `router.refresh()`, so the Server Components re-fetch and the page updates.
3. **Responses.** Success is `{ "data": … }`. Errors are `{ "error": "message" }` with a proper status (400 validation,
   401 not signed in, 403 forbidden, 404, 409 conflict, 429 rate limited). The message is safe to show to the user.

### Authentication and roles

- `POST /api/auth/login` checks the password (bcrypt), then sets an **httpOnly, SameSite=Lax, Secure-in-production** cookie
  holding a signed JWT (HS256, 7 days). The JWT only says *who* the user is.
- On **every** API request the backend (`middleware/auth.ts`) loads the user from the database and checks they are
  still active, so a deactivated or demoted account loses access immediately.
- Roles: `tenant`, `caretaker`, `landlord`. Routes declare what they need: `requireStaff`, `requireLandlord`, `requireTenant`.
- The frontend decides *which page to show* (layouts call `requireStaff()` / `requireTenant()` / `requireLandlord()`), but the
  **backend is the security boundary**. Hiding a page never grants or denies data on its own. `AUTH_SECRET` lives only in the backend.
- The frontend `middleware.ts` only redirects visitors with no cookie to `/login`. It is a convenience, not a check.

| Capability                              | Tenant | Caretaker | Landlord |
| --------------------------------------- | :----: | :-------: | :------: |
| Own rent, receipts, requests            |   ✓    |           |          |
| Record payments, manage tenants/units   |        |     ✓     |    ✓     |
| Handle complaints, post announcements   |        |     ✓     |    ✓     |
| Delete payments, units, notices, tickets|        |           |    ✓     |
| Reports and caretaker management        |        |           |    ✓     |

### "Row-level security" with MongoDB

MongoDB has no row-level security like Postgres, so it is enforced in the API:

1. All tenant-facing endpoints live under `/api/me/*` behind `requireTenant`, which loads the tenant **from the session** into `req.tenant`.
2. Every query there is scoped by `req.tenant._id` (payments, receipts, tickets, replies). An id sent from the browser is never trusted to choose whose data to return; a foreign id simply returns `404`.
3. Photos are served by `GET /api/uploads/:name`, which checks the tenant owns a ticket with that photo (staff can see all).
4. If you add a tenant-facing endpoint, put it under `/me` and scope it by `req.tenant`.

### Other protections

- **CSRF:** SameSite=Lax cookie plus `originCheck`, which rejects state-changing requests whose `Origin` isn't in `FRONTEND_URL`.
- **Validation:** every request body is validated with Zod; the first issue becomes the 400 message.
- **Login:** constant-time compare for unknown emails, plus per-IP and per-email rate limits (in-memory, see below).
- **Uploads:** 5 MB cap, file type verified from the file's bytes (JPG/PNG/WebP), random server-chosen filenames, path traversal blocked.
- **CSV export:** cells starting with `= + - @` are neutralised so spreadsheets can't run them as formulas.
- `helmet` headers on the API; clickjacking and sniffing headers on the web app.

### Data model (`backend/src/models.ts`)

`Profile` (login: tenant / caretaker / landlord) · `Property` · `Unit` · `Tenant` · `Payment` · `Ticket` · `TicketReply` · `Announcement`.

Payment status is **derived**, never stored (`backend/src/services/rent.ts`): for a tenant and month, `paid >= rent` is Paid,
`0 < paid < rent` is Partial, `paid = 0` is Unpaid. Due date and "days overdue" are computed in Nairobi time from `DUE_DAY`
(default the 5th) **on the backend** and sent to the UI, so the frontend has no business rules to keep in sync.

### API reference (all under `/api`)

| Area            | Endpoints                                                                                                     | Access           |
| --------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- |
| Auth            | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/profile` (own profile, staff) · `POST /auth/change-password` | public / any user / staff |
| Rent            | `GET /rent/overview?month=` · `GET /rent/roll?month=`                                                          | staff            |
| Payments        | `POST /payments` · `DELETE /payments/:id`                                                                      | staff · landlord |
| Tenants         | `GET /tenants` · `POST /tenants` · `PATCH /tenants/:id` · `POST /tenants/:id/move-out` · `POST /tenants/:id/reset-password` · `DELETE /tenants/:id` (moved-out only) | staff · landlord (delete) |
| Units           | `GET /units` · `POST /units` · `PATCH /units/:id` · `DELETE /units/:id`                                        | staff · landlord (delete) |
| Complaints      | `GET /tickets?status=&priority=` · `GET /tickets/attention` · `GET /tickets/:id` · `POST /tickets/:id/replies` · `PATCH /tickets/:id` · `POST /tickets/:id/read` · `DELETE /tickets/:id` | staff · landlord (delete) |
| Announcements   | `GET /announcements?limit=` · `POST /announcements` · `DELETE /announcements/:id`                              | any user · staff · landlord |
| Caretakers      | `GET /caretakers` · `POST /caretakers` · `PATCH /caretakers/:id` · `POST /caretakers/:id/reset-password`       | landlord         |
| Reports         | `GET /reports/summary` · `GET /reports/export?type=summary\|month&month=` (CSV)                                | landlord         |
| Tenant self-service | `GET /me/profile` · `PUT /me/phone` · `GET /me/ledger` · `GET /me/payments/:id` · `GET /me/tickets` · `POST /me/tickets` (multipart, optional photo) · `POST /me/tickets/:id/replies` | tenant |
| Uploads         | `GET /uploads/:name`                                                                                          | owner tenant / staff |
| M-Pesa (phase 2)| `POST /mpesa/callback` (returns 501 for now)                                                                   | Safaricom        |
| Health          | `GET /health` (outside `/api`)                                                                                 | public           |

### Project layout

```
deed-hostels/
├─ package.json                 root helper scripts (install:all, dev:api, dev:web, seed, build)
├─ backend/
│  ├─ .env.example
│  ├─ scripts/seed.ts           demo data
│  └─ src/
│     ├─ server.ts              entry: connect DB, listen
│     ├─ app.ts                 Express app and middleware order
│     ├─ config.ts              validated environment settings
│     ├─ db.ts · models.ts      Mongoose connection and schemas
│     ├─ middleware/            auth.ts (session, roles, tenant scope) · errors.ts (CSRF origin check, error mapping)
│     ├─ routes/                one file per area (see API reference); routes/index.ts mounts them
│     ├─ services/              rent.ts (derived status, ledger) · queries.ts · tickets.ts · uploads.ts · mpesa.ts (phase-2 hook)
│     └─ lib/                   http.ts (HttpError, validation, rate limit) · jwt.ts · format.ts · types.ts
└─ frontend/
   ├─ .env.example
   ├─ next.config.mjs           /api/* → backend proxy, security headers
   └─ src/
      ├─ middleware.ts          no cookie → /login
      ├─ app/                   routes: /login, /admin/*, /tenant/*
      ├─ components/            ui.tsx (shadcn-style primitives), shells, forms/, charts
      └─ lib/                   server-api.ts (Server Components → API) · client-api.ts + use-api.ts (browser → API) · types.ts · format.ts · reminders.ts
```

The API response types in `frontend/src/lib/types.ts` mirror the DTOs in `backend/src/` by hand. If you change a response shape,
change both. (If the project grows, move the shared types into a small package or generate them from an OpenAPI spec.)

## Environment variables

**Backend (`backend/.env`)**

| Variable       | Purpose                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`  | MongoDB connection string, including the database name                             |
| `AUTH_SECRET`  | Signing key for session tokens, at least 32 random characters                      |
| `FRONTEND_URL` | Web app origin(s), comma-separated. Used for CORS and the CSRF origin check        |
| `TRUST_PROXY`  | `1` when behind the Next.js proxy or any reverse proxy (so the real client IP is used) |
| `PORT`         | API port (default 4000)                                                            |
| `DUE_DAY`      | Day of month rent is due (default 5)                                               |
| `UPLOAD_DIR`   | Where ticket photos are stored (default `./uploads`)                               |

**Frontend (`frontend/.env.local`)**

| Variable      | Purpose                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| `BACKEND_URL` | Where the API runs. Used by the `/api/*` proxy and server-side fetching. Never sent to the browser |

## Deploying

- **Backend:** `cd backend && npm run build && npm start` (set the env vars on your host, or use `npm run start:env` with a `.env` file). Needs a persistent disk or an object-storage swap for photos (below). Put it behind HTTPS.
- **Frontend:** `cd frontend && npm run build && npm start`, with `BACKEND_URL` pointing at the API. Works on Node hosts and on Vercel.
- **Keep the API private if you can.** The browser only needs to reach the web app, because `/api/*` is proxied. Only `POST /api/mpesa/callback` (phase 2) must be reachable by Safaricom, so expose that path through your proxy.
- Set `FRONTEND_URL` on the backend to the web app's public origin, and serve both over HTTPS (the session cookie is `Secure` in production).
- Next.js rewrites are resolved when the frontend is **built**, so set `BACKEND_URL` before `npm run build`.

## Things to know before going live

- **Photo uploads are stored on the backend's local disk.** That works on a VPS or a Docker volume. On ephemeral hosts, swap `backend/src/services/uploads.ts` for S3, Cloudflare R2 or similar. Photos are only served through the authorised `/api/uploads/:name` endpoint.
- **Rent history uses each unit's *current* rent.** If you change a unit's rent, past months recalculate. Store a per-tenant rent snapshot if you need frozen history.
- **Login and ticket rate limiting is in-memory** (per API instance). Use Redis if you run several instances.
- **Receipts and reports "PDF"** use the browser's Print dialog (Save as PDF), so no PDF library is needed.
- **Reminders** open WhatsApp/SMS on the caretaker's device with the message prefilled. Nothing is sent automatically.
- The UI primitives in `frontend/src/components/ui.tsx` follow shadcn/ui conventions and are hand-written. If you use the shadcn CLI, you can swap them one by one.

## Phase 2: M-Pesa STK Push (prepared, not implemented)

`backend/src/services/mpesa.ts` documents the flow and exposes `initiateStkPush()` / `recordMpesaCallback()` stubs.
`POST /api/mpesa/callback` returns 501 for now, and the tenant home shows a disabled "Pay with M-Pesa" button.
To finish it: fill the commented `MPESA_*` variables in `backend/.env.example`, implement the two functions, add a
`POST /api/me/pay/mpesa` route behind `requireTenant`, and enable the button in `frontend/src/app/tenant/page.tsx`.
The unique index on `Payment.referenceCode` makes callbacks idempotent.
