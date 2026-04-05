# LedgerFlow — Frontend

Next.js UI for **LedgerFlow**. This app is a **demo client** to visualize and exercise the Express/MongoDB API—layout, filters, and role-aware screens—not the source of business rules.

---

## Tech Stack

- **Next.js** (App Router)
- **Tailwind CSS**
- **Framer Motion** (landing and subtle UI motion)
- **React local state** (no global store)

---

## Frontend Features

- **Dashboard** (`/dashboard`): summary, records list, categories, trends, profile
- **Role-based UI**: Admin / Analyst / Viewer (visibility and actions driven by `/auth/me`)
- **Auth**: Google OAuth entry via backend redirects; session assumed after login
- **Records**: create flow (modal) where the role allows it
- **Filters**: category + date range (applied across dashboard sections)
- **Admin**: management modal (users, roles, status, records) when role is admin
- **Landing** (`/`): product overview; links to login / dashboard

---

## Backend Integration

- Communication is **REST over HTTP**, with **`credentials: 'include'`** so **session cookies** issued by the backend are sent on API calls.
- In dev, requests often go through a **same-origin proxy** (`/express/...`) so the browser origin stays the Next app while the route forwards to the API—**auth and RBAC stay on the server**.

**Typical endpoints consumed:**

| Area | Examples |
|------|-----------|
| Auth | `GET /auth/me` |
| Records | `GET/POST /api/records`, `GET/PATCH/DELETE` record by id |
| Dashboard | `GET /api/dashboard/summary`, `/categories`, `/trends` |
| Admin | `GET /api/users`, admin dashboard routes under `/api/admin/...` |

The backend returns **403/401** and **role-scoped data**. The UI **only displays** what the API allows; it does not enforce access control.

---

## Role-Based UI

| Role | UI behavior |
|------|-------------|
| **Admin** | Full dashboard + user/record management entry points |
| **Analyst** | System-wide metrics in dashboard cards; **read-only** (no destructive or user-admin actions) |
| **Viewer** | Personal-scoped dashboard; read-focused |

---

## Folder Structure

```
src/
├── app/                 # Routes (/, /login, /dashboard, API proxy)
├── components/          # MagicBento (dashboard), auth flows, landing, DotGrid
├── lib/                 # Small helpers (e.g. utils)
└── app/globals.css      # Global styles
```

---

## Setup

From this directory:

```bash
npm install
npm run dev
```

Default: **http://localhost:3000**. Point `NEXT_PUBLIC_API_URL` at your API base if you are not using the bundled proxy.

---

## Notes

- **Intentionally lightweight**: no duplicated domain logic; **validation, RBAC, and aggregations live in the backend**.
- **Purpose**: demonstrate API behavior clearly for operators and reviewers—not a standalone product frontend.
