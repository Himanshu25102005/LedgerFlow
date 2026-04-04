# LedgerFlow Backend — Technical Documentation

**Stack:** Node.js, Express, MongoDB (Mongoose), Passport (local + Google OAuth), express-session  
**Role:** REST API and session-backed authentication for a personal / organizational finance ledger (income & expense records, dashboards, admin analytics).

This document describes **architecture, data flow, security, and APIs** for the LedgerFlow backend. It is written to be suitable for **technical assignments and senior-level interviews**: it explains *what* the system does, *how* requests move through layers, and *why* key design choices were made.

---

## 1. Project Overview

### 1.1 Purpose

The backend powers **LedgerFlow**: users authenticate, create and manage **financial records** (transactions), view **personal dashboards** (totals, category breakdowns, trends), and—depending on role—access **admin-wide aggregates** across all users’ data.

### 1.2 Key Features

| Area | Capability |
|------|------------|
| **Authentication** | Local registration/login via Passport Local Strategy; Google OAuth 2.0; session cookies (`credentials: true` with CORS for SPA). |
| **RBAC** | Roles: `admin`, `analyst`, `viewer`. Middleware restricts routes by role. |
| **Records** | CRUD-style operations on transactions with filters and pagination; **soft delete** for safe removal. |
| **Analytics** | MongoDB **aggregation pipelines** for summaries, category grouping, monthly trends, and (admin) user-level rollups. |
| **Admin** | Cross-tenant metrics: global summary, category analytics, paginated trends, user-wise summaries. |
| **User admin** | Listing users, role changes, optional **active/inactive** status (middleware can enforce active-only access). |

### 1.3 Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express  
- **Database:** MongoDB via **Mongoose**  
- **Auth:** `passport`, `passport-local-mongoose`, `passport-google-oauth20`  
- **Session:** `express-session` + `passport.session()`  
- **Config:** `dotenv` (e.g. `MONGO_URI`, Google OAuth credentials)

### 1.4 High-Level Architecture

The API follows a **layered architecture**: HTTP concerns stay at the edges; **business rules and data access** live in **services**; **persistence** is modeled in **Mongoose schemas**. Authentication runs **before** protected routes via session + Passport; authorization runs via **role** middleware on selected routes.

```
Client (Browser / SPA)
        │
        ▼
   Express App (CORS, JSON, session, Passport)
        │
        ▼
   Routes ──► Middleware (auth, role, optional status)
        │
        ▼
   Controllers (parse request, call service, map to HTTP)
        │
        ▼
   Services (validation, queries, aggregations)
        │
        ▼
   Mongoose Models ──► MongoDB
```

---

## 2. Folder Structure

Below is the **logical** layout of the LedgerFlow `Backend` (file names may vary slightly during refactors; adjust paths to match your tree).

```
Backend/
├── app.js                 # Express app: middleware, Passport, route mounting
├── bin/www                # HTTP server bootstrap
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── user.js            # User schema (Passport plugin, role, status, …)
│   └── record.js          # Transaction / record schema (amount, type, category, user ref, soft delete)
├── routes/
│   ├── index.js           # Root pages, signup/login, Google OAuth, getInfo
│   ├── auth.js            # Passport Google strategy registration
│   ├── users.js           # /api/me, user listing, role/status, delete
│   ├── record.routes.js   # /api/records CRUD + soft delete
│   └── dashboard.route.js  # dashboard + admin analytics routes
├── middlewares/
│   ├── checkLogin.js      # Session auth + optional active-account check
│   └── checkRole.js       # RBAC: allowed roles per route
├── controllers/
│   ├── record.controller.js
│   └── dashboard.controller.js
├── services/
│   ├── record.service.js
│   └── dashboard.service.js
└── Backend_Doc.md         # This document
```

### 2.1 Purpose of Each Folder

| Folder | Responsibility |
|--------|----------------|
| **`routes/`** | Declares **URLs**, **HTTP methods**, and **middleware chain** per endpoint. No heavy business logic. |
| **`controllers/`** | **Adapts** HTTP ↔ domain: reads `req.body` / `req.query` / `req.params`, invokes **services**, sets **status codes** and **JSON** shape. Kept **thin** on purpose. |
| **`services/`** | **Business logic**, query construction, aggregations, pagination math, soft-delete rules, ownership checks at the data layer. |
| **`models/`** | **Schema**, validation defaults, references (`user` on records), indexes (when added), plugins (e.g. passport-local-mongoose on User). |
| **`middlewares/`** | **Cross-cutting** request gates: authenticated? active? role allowed? Runs **before** the controller. |
| **`config/`** | Environment-driven **wiring** (DB URI, secrets). Keeps connection logic out of `app.js`. |

### 2.2 Separation of Concerns

- **Routes** answer: *which path and which middlewares?*  
- **Controllers** answer: *what did the client send, and what HTTP response do we return?*  
- **Services** answer: *what are the rules and how do we read/write data?*  
- **Models** answer: *what is the persisted shape and integrity of documents?*

This split improves **testability** (services unit-tested without HTTP), **reuse** (same service from multiple controllers or jobs), and **onboarding** (each layer has a single reason to change).

---

## 3. Layered Architecture (Deep Dive)

### 3.1 Route → Controller → Service → Model → Database

| Layer | Responsibility | Should NOT |
|-------|----------------|------------|
| **Route** | Mount path, order `isLoggedIn` → `checkRole` → `controller` | Embed aggregation pipelines |
| **Controller** | Validate presence of inputs at HTTP level, call service, map errors to status | Duplicate business rules |
| **Service** | Filters, pagination, `$match` stages, ownership (`user` / `userId`), soft delete | Send `res.json` directly |
| **Model** | Field types, enums, refs, defaults | Encode report logic |
| **DB** | Store documents | Enforce RBAC (that stays in app layer) |

### 3.2 Why This Architecture

- **Scalability:** New endpoints add a route line + thin controller + service function; aggregations stay centralized.  
- **Maintainability:** A bug in “who can see this record?” is fixed in **one service** rather than scattered across controllers.  
- **Security:** AuthN at middleware; AuthZ at middleware + service **ownership** checks.

### 3.3 Benefits (Interview Talking Points)

- Clear **boundaries** for code review and junior ownership.  
- Services can later move behind a **queue** or **microservice** without rewriting HTTP handlers.  
- MongoDB **aggregation** stays in services—easier to optimize (indexes, `$facet`) in one place.

---

## 4. Data Flow (Critical Path)

### 4.1 Generic Request Lifecycle

```
Client
  │  HTTP (JSON + session cookie)
  ▼
Express middleware stack
  │  cors → json → session → passport.session()
  ▼
Route matcher
  │  isLoggedIn (401/403 if anonymous or inactive)
  │  checkRole([...]) (403 if role not allowed)
  ▼
Controller
  │  extract body/query/params, req.user._id
  ▼
Service
  │  build filter / pipeline, enforce ownership & soft delete
  ▼
Mongoose → MongoDB
  ▼
Controller ← result or error
  ▼
Client ← JSON + HTTP status
```

### 4.2 Example: Creating a Record (End-to-End)

1. **Client** sends `POST /api/records` with JSON `{ amount, type, notes, category }` and session cookie.  
2. **Express** parses JSON; **session** loads user; **Passport** attaches `req.user`.  
3. **`isLoggedIn`** ensures authenticated (and optionally `status === 'active'`).  
4. **`createRecordController`** reads body + `req.user._id`, calls **`createRecordService`**.  
5. **`createRecordService`** validates required fields, creates a document with **`user`** (ObjectId ref) set to the caller.  
6. **Mongoose** persists to the `recordSchema` collection (actual collection name follows Mongoose pluralization rules).  
7. **Controller** responds **`201`** with `{ success: true, data: record }`.

### 4.3 Example: Dashboard Summary

1. **Client** `GET /api/dashboard/summary` with session.  
2. **`isLoggedIn`** passes.  
3. **`getSummaryController`** passes `req.user._id` to **`getSummaryService`**.  
4. **Service** runs **`aggregate`**: `$match` (this user, not deleted) → `$group` (sum income vs expense) → returns income, expense, balance.  
5. **Controller** returns **`200`** + `{ success, data }`.

---

## 5. Models & Schema Design

### 5.1 User Model

**Purpose:** Identity, credentials (local), OAuth link, **role**, optional rollups, **status**, and references to transactions (if populated).

| Field | Type / Notes |
|-------|----------------|
| `name` | String |
| `username` | String, required (slug-like after Google flow) |
| `password` | String (managed by passport-local-mongoose for local users) |
| `email` | String |
| `googleId` | String (unique lookup for OAuth users) |
| `role` | String enum: `viewer` \| `analyst` \| `admin`, default `viewer` |
| `createdAt` | Date |
| `totalIncome` / `totalExpense` | Numbers (optional cached aggregates if maintained elsewhere) |
| `status` | `active` \| `inactive`, default `active` |
| `transactions` | Array of ObjectId refs (intended link to record/transaction documents) |

**Plugin:** `passport-local-mongoose` adds salt/hash and authentication helpers.

**Relationships:** One user → many records via **`record.user`** (canonical ownership field in the record schema).

### 5.2 Record (Transaction) Model

**Purpose:** Single ledger line: amount, direction (income/expense), metadata, owner, soft delete.

| Field | Type / Notes |
|-------|----------------|
| `amount` | Number |
| `Type` or `type` | Enum `income` \| `expense` (see **implementation note**: schema and code should use **one consistent name**; aggregations reference `$type` in services) |
| `date` | Date, default now |
| `isDeleted` | Boolean, default `false` (**soft delete**) |
| `notes` | String |
| `category` | String |
| `user` | ObjectId ref → `user` (**ownership**; queries should use this field consistently) |

**Indexing (recommended):** Compound index `{ user: 1, isDeleted: 1, date: -1 }` for list + dashboard queries; `{ user: 1, category: 1 }` for category reports.

**Soft delete:** Records are not removed; `isDeleted: true` hides them from normal queries.

### 5.3 References

- **Record → User:** `record.user` stores the creator/owner’s `_id`.  
- **User → Records:** Optional `transactions[]` on user for reverse navigation or legacy design; list APIs typically query **by `user`** on the record collection.

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

**Local**

- **Register:** `POST /signup` creates a user via `User.register` (passport-local-mongoose).  
- **Login:** `POST /login` with `passport.authenticate('local', { ... })`; session cookie issued.

**Google OAuth**

- `GET /auth/google` → Google consent.  
- `GET /auth/google/callback` → strategy finds or creates user by `googleId`, establishes session, redirects to frontend (e.g. `http://localhost:3000/`).

**Session model**

- Server stores session; browser sends **cookie** (`credentials: true` on CORS).  
- `passport.serializeUser` / `deserializeUser` attach `req.user` on each request.

### 6.2 `isLoggedIn` Middleware (Concept)

**Responsibilities:**

1. If `!req.isAuthenticated()` → **`401`** JSON (API style) or redirect (HTML routes).  
2. Optionally: if `req.user.status !== 'active'` → **`403`** “Account inactive”.  
3. Else `next()`.

**Why:** Authentication is **centralized**—controllers assume `req.user` exists only after this gate.

### 6.3 Role-Based Access Control (RBAC)

**Roles**

| Role | Typical use |
|------|-------------|
| `admin` | Full record mutation, global analytics, user administration. |
| `analyst` | Read broader datasets (e.g. admin category/trends/user summary with `admin`/`analyst`). |
| `viewer` | Own profile and limited read scope (e.g. create own records; may be excluded from `/api/records` list depending on route config). |

**`checkRole(allowedRoles)`**

- Returns an Express middleware.  
- If `req.user.role` is in `allowedRoles` → `next()`.  
- Else **`403 Forbidden`**.

**Enforcement points**

- **Route level:** Fast fail before controller.  
- **Service level:** **Ownership** (`user` / `_id` match) prevents IDOR even if a route is misconfigured.

---

## 7. Middleware System

| Middleware | Role | Typical order |
|------------|------|----------------|
| `isLoggedIn` | AuthN + optional active check | First on protected API routes |
| `checkRole([...])` | AuthZ by role | After `isLoggedIn` |

**Execution order example**

```
GET /api/admin/summary
  → isLoggedIn
  → checkRole(['admin'])
  → getAdminController
```

**Status checks:** When implemented on `req.user.status`, they belong **after** authentication and **before** business logic so inactive users cannot call APIs.

---

## 8. Controllers

### 8.1 Role

Controllers **translate HTTP** into service calls and **translate results** into HTTP responses. They catch errors and map them to **500** (and ideally 400/404 where services throw domain-specific errors).

### 8.2 Thin Controllers — Why

- **Single responsibility:** HTTP adaptation only.  
- **Easier testing:** Mock service, assert status + JSON.  
- **Consistency:** All “create record” rules live in **one service**.

### 8.3 Examples (As Designed)

**`createRecordController`**

- Reads `amount`, `type`, `notes`, `category` from body.  
- Passes `userId: req.user._id` to service.  
- Returns **201** + `{ success, data }`.

**`getRecordController`**

- Reads query: `type`, `category`, `date`, `page`, `limit`.  
- Passes `userId` for scoping.  
- Returns **200** + paginated payload from service.

**Admin controllers (`getAdminController`, etc.)**

- No per-user filter in controller; service aggregates **global** (or role-limited) datasets.  
- Should **`await`** async service functions before sending JSON.

---

## 9. Services (Core Logic)

### 9.1 Why Services Exist

- **Reuse:** Same pagination and filter logic for web and future CLI/cron.  
- **Clarity:** Controllers stay readable; all Mongo details in one module.  
- **Security:** Ownership and `isDeleted` filters are enforced **close to the query**.

### 9.2 Separation from Controllers

| Concern | Belongs in |
|---------|------------|
| “Is `page` valid?” | Controller (defaults) + Service (clamp if needed) |
| “Which fields can be updated?” | Service **allowlist** |
| “Can this user update this `_id`?” | Service query `{ _id, user: userId }` |

### 9.3 Record Service Examples

| Function | Behavior |
|----------|----------|
| **`createRecordService`** | Validates required fields; `create` with `user: userId`. |
| **`getRecordService`** | Builds filter from type/category/date/**user**; `skip`/`limit`; returns data + `totalPages`, etc. |
| **`updateRecordService`** | Allowlisted `$set`; `findOneAndUpdate` scoped to owner. |
| **`softDeleteRecordService`** | Sets `isDeleted: true` for owner’s active row. |
| **`getRecordByIdService`** | `findOne` by `_id`, owner, `isDeleted: false`. |

### 9.4 Dashboard / Admin Services

| Function | Behavior |
|----------|----------|
| **`getSummaryService(userId)`** | User-scoped totals and balance via `$match` + `$group`. |
| **`getSummaryByCategoryService(userId, incomeFlag)`** | Income or expense breakdown by category. |
| **`getTrendsService(userId)`** | Monthly income/expense/balance. |
| **`getAdminService`** | Global totals + active user count. |
| **`getAdminByCategoryService`** | Category rollup (e.g. expense-focused) with optional percentage. |
| **`getAdminTrendsService({ page, limit })`** | Paginated global monthly trends via **`$facet`**. |
| **`getUsersSummaryService` / user summary** | Per-user aggregates + **`$lookup`** to user collection + **`$facet`** pagination. |

---

## 10. API Routes (Detailed)

Base URL assumed: `http://localhost:<PORT>` (see `bin/www`; align with deployment).  
Unless noted, responses are JSON. **Session cookie** required for protected routes.

---

### 10.1 Authentication & Session (Root / Index Router)

| Method | Endpoint | Description | Body / Query | Response | Access |
|--------|----------|-------------|--------------|----------|--------|
| POST | `/signup` | Register local user | `name`, `username`, `email`, `profilePicture`, `password` | Success message + user | Public |
| POST | `/login` | Local login (session) | Passport local fields | Redirect on success/failure | Public |
| GET | `/auth/google` | Start Google OAuth | — | Redirect to Google | Public |
| GET | `/auth/google/callback` | OAuth callback | — | Redirect to SPA | Public |
| GET | `/logout` | Destroy session | — | Redirect | Authenticated |
| GET | `/getInfo` | Session user info | — | `{ user }` | Authenticated (HTML-oriented helper) |

---

### 10.2 User Routes (`/users` mount + `/api/*` paths)

Exact mounting in `app.js` is `app.use("/users", usersRouter)` — full paths are **`/users/api/...`** unless routes are also mounted at root elsewhere. **Verify** `app.js` mounts for your deployment; document the **canonical** prefix your frontend uses.

| Method | Endpoint | Description | Params / Body / Query | Response | Access |
|--------|----------|-------------|------------------------|----------|--------|
| GET | `/api/me` | Current user profile subset | — | `{ success, data: { name, username, email, role, totalIncome, totalExpense } }` | Logged in |
| GET | `/api/user` | Paginated user list | `page`, `limit` | `{ success, count, totalPages, currentPage, users }` | Logged in |
| GET | `/api/users/:id` | Single user by id | `id` | `{ success, data }` | Logged in |
| PATCH | `/api/user/:id/role` | Change role | Body: `{ role }` enum | `{ success, user }` | **admin** |
| PATCH | `/api/users/:id/status` | Set active/inactive | Body: `{ status }` | `{ success, user }` | **admin** |
| DELETE | `/api/users/:id` | Delete user | `id` | `{ success }` | **admin** |

---

### 10.3 Record Routes (`/api/records`)

| Method | Endpoint | Description | Body / Query | Response | Access |
|--------|----------|-------------|--------------|----------|--------|
| POST | `/api/records` | Create record | `{ amount, type, notes, category }` | `201` `{ success, data }` | Logged in |
| GET | `/api/records` | List + filter + pagination | `type`, `category`, `date`, `page`, `limit` | `200` `{ success, data, totalPages, totalRecords, currentPage, count }` | **admin**, **analyst** (per route config) |
| PATCH | `/api/records/:recordId` | Partial update | Body: `type`, `date`, `notes`, `category`, `amount` | `200` `{ success, data }` | **admin** |
| DELETE | `/api/records/:id/delete` | Soft delete | — | `200` `{ success, data }` | **admin** |
| GET | `/api/records/:id` | Single record | `id` | `200` `{ success, data }` | **admin**, **analyst** |

**Note:** Route parameter names (`recordId` vs `id`) must match what the **controller** reads; align these across route, controller, and docs.

---

### 10.4 Dashboard Routes (User-Scoped)

| Method | Endpoint | Description | Query | Response | Access |
|--------|----------|-------------|-------|----------|--------|
| GET | `/api/dashboard/summary` | Income, expense, balance for `req.user` | — | `{ success, data: { income, expense, balance } }` | Logged in |
| GET | `/api/dashboard/categories` | Category breakdown | `income` (truthy → income categories; else expense) | `{ success, data: [ { categoryName, total }, ... ] }` | Logged in |
| GET | `/api/dashboard/trends` | Monthly trends for user | (optional filters if implemented) | `{ success, data: [ { month, year, income, expense, balance }, ... ] }` | Logged in |

*Assignment naming alias:* Some specs use `/api/trends` or `/api/summary/categories`; in this codebase the **dashboard** prefix groups these under **`/api/dashboard/*`**.

---

### 10.5 Admin Routes (Cross-User Analytics)

| Method | Endpoint | Description | Query | Response | Access |
|--------|----------|-------------|-------|----------|--------|
| GET | `/api/admin/summary` | Global income/expense/balance + user counts | — | `{ success, data: { totalUser, income, expense, balance } }` | **admin** |
| GET | `/api/admin/categories` | Global category analytics | — | `{ success, data }` (category + totals [% if computed]) | **admin**, **analyst** |
| GET | `/api/admin/trends` | Global monthly trends (paginated) | `page`, `limit` | `{ success, data, totalRecords, totalPages, currentPage }` | **admin**, **analyst** |
| GET | `/api/admin/user-summary` | Per-user rollup (paginated) | `page`, `limit` | `{ success, data, totalRecords, totalPages, currentPage }` | **admin**, **analyst** |

---

## 11. Aggregation Pipelines

MongoDB **aggregation** runs server-side in a **single round trip**, streaming documents through stages. It is preferred over **N+1 queries** or loading all rows into Node for math.

### 11.1 Stages Used in This Project

| Stage | Purpose in LedgerFlow |
|-------|------------------------|
| **`$match`** | Filter by `user`, `isDeleted: false`, `type`, date existence—**reduce** working set early. |
| **`$group`** | Sum income/expense, group by category, or by `{ year, month }`. |
| **`$project`** | Rename `_id` → `categoryName`, shape output, compute `balance`. |
| **`$sort`** | Order categories by total or timeline by year/month. |
| **`$lookup`** | Join records rollup to **`users`** for names/emails in admin user summary. |
| **`$facet`** | **Pagination:** one branch `[$skip, $limit]` for page data, another `[$count]` for total—avoids second query. |
| **`$unwind`** | De-normalize `user` array after lookup (one doc per user). |
| **`$addFields`** | e.g. percentage of category vs total expense. |

### 11.2 Summary Calculation

- **`$match`**: current user, not deleted.  
- **`$group`**: `_id: null`, `$sum` with `$cond` on type for income vs expense.  
- **Result:** Single document → map to `income`, `expense`, `balance`.

### 11.3 Category Grouping

- **`$match`**: user + type (income **or** expense) + not deleted.  
- **`$group`**: `_id: "$category"`, `total: { $sum: "$amount" }`.  
- **`$project`**: expose `categoryName`.  
- **`$sort`**: by `total` descending.

### 11.4 Trends (Monthly)

- **`$group`**: `_id: { month: { $month: "$date" }, year: { $year: "$date" } }`, conditional sums for income/expense.  
- **`$project`**: flatten month/year, compute balance.  
- **`$sort`**: chronological or reverse for “latest first.”

### 11.5 User-Wise Summary (Admin)

- **`$group`**: by user id, sum income/expense.  
- **`$lookup`**: `from: "users"`, match `_id`.  
- **`$unwind`**: user doc.  
- **`$project`**: `name`, `email`, totals, balance.  
- **`$sort`**: e.g. by expense desc.  
- **`$facet`**: paginate `data` + `totalCount`.

---

## 12. Pagination System

### 12.1 Offset Pagination (`skip` / `limit`)

- **`page`**, **`limit`** from query; `skip = (page - 1) * limit`.  
- Used in **`find`** + **`countDocuments`** (records list, user list) with `Promise.all` for **rows + total**.

### 12.2 Aggregation Pagination (`$facet`)

Used when the dataset is produced by a **pipeline** (e.g. admin trends, user summary):

```json
{
  "$facet": {
    "data": [ { "$skip": skip }, { "$limit": limit } ],
    "totalCount": [ { "$count": "count" } ]
  }
}
```

**Why:** Counting grouped rows requires the **same** pipeline up to grouping; `$facet` runs **one** aggregation and returns both **page** and **total** for `totalPages = ceil(total / limit)`.

---

## 13. Soft Delete Mechanism

**What:** Rows stay in MongoDB; a flag **`isDeleted: true`** marks logical removal.

**Why:** Audit, recovery, consistent foreign keys, and safer “delete” UX.

**How queries exclude deleted:** Every read/update aggregate starts with **`isDeleted: false`** in **`$match`** or in **`find`** filters.

**Soft delete write:** `findOneAndUpdate` with `{ _id, user, isDeleted: false }` → `$set: { isDeleted: true }` so double-delete or wrong owner fails cleanly.

---

## 14. Error Handling

| Layer | Pattern |
|-------|---------|
| **Controller** | `try/catch`; `500` + `{ error: e.message }` for unexpected failures. |
| **Service** | `throw new Error("...")` for validation, not found, unauthorized. |

**HTTP status codes (target practice)**

- **200** OK  
- **201** Created  
- **400** Bad request (validation)  
- **401** Unauthenticated  
- **403** Forbidden (role or inactive)  
- **404** Not found  
- **500** Server error  

**Common scenarios:** Missing body fields, record not found or wrong owner, invalid role/status enum, aggregation errors (fix schema field names to avoid).

---

## 15. Security Considerations

| Topic | Measure |
|-------|---------|
| **Ownership** | Updates/deletes scoped by **`user`** (or equivalent) matching `req.user._id`. |
| **RBAC** | `checkRole` on admin/analyst routes. |
| **Input validation** | Service-level required fields; allowlist on patch. |
| **Session fixation / HTTPS** | Use strong `session.secret` from env; `cookie.secure: true` in production over HTTPS. |
| **CORS** | Restrict `origin` to known frontends; keep `credentials: true` only when needed. |
| **IDOR** | Never trust client `userId` in body for ownership—use **`req.user._id`**. |

---

## 16. Diagrams

### 16.1 Architecture (Layers)

```
┌─────────┐     ┌─────────────┐     ┌────────────┐     ┌─────────┐     ┌──────────┐
│ Routes  │ ──► │ Middlewares │ ──► │ Controller │ ──► │ Service │ ──► │ MongoDB  │
└─────────┘     └─────────────┘     └────────────┘     └─────────┘     └──────────┘
                     │                                      │
                     │ Passport Session                     │ Models
                     ▼                                      ▼
               req.user populated                      Schemas / refs
```

### 16.2 Data Flow (Authenticated API)

```
  Client
    │
    │  HTTP + Cookie
    ▼
┌───────────┐
│  Express  │
└─────┬─────┘
      │
      ▼
┌─────────────┐     No        ┌──────┐
│ isLoggedIn  │ ────────────► │ 401  │
└─────┬───────┘               └──────┘
      │ Yes
      ▼
┌─────────────┐     No        ┌──────┐
│ checkRole?  │ ────────────► │ 403  │
└─────┬───────┘               └──────┘
      │ Yes
      ▼
┌─────────────┐
│ Controller  │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Service    │ ──► aggregate / find / update
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Response   │  JSON + status
└─────────────┘
```

### 16.3 RBAC Flow

```
Request with session
        │
        ▼
   req.user.role?
        │
        ├─ in allowedRoles ──► next() ──► controller
        │
        └─ not allowed ──► 403 Forbidden
```

### 16.4 Aggregation Flow (Dashboard Summary)

```
[Records Collection]
        │
        ▼
    ┌────────┐
    │ $match │  user == X, isDeleted == false
    └────┬───┘
         ▼
    ┌────────┐
    │ $group │  sum income, sum expense
    └────┬───┘
         ▼
    ┌────────┐
    │ shape  │  balance = income - expense
    └────────┘
```

---

## 17. Design Decisions (Why)

| Decision | Reason |
|----------|--------|
| **Service layer** | Centralizes business rules, keeps HTTP thin, improves testability and reuse. |
| **RBAC** | Separates **who you are** from **what you may do**; supports admin/analyst/viewer personas without duplicating checks in every query. |
| **Soft delete** | Preserves history, supports undo/audit, avoids breaking references. |
| **Aggregation** | Efficient analytics in one DB round trip; scales better than loading all transactions into Node. |
| **Session + Passport** | Simple cookie-based auth for same-site or credentialed SPA; Google OAuth reduces password handling. |
| **`$facet` pagination** | Correct totals on grouped data without running the pipeline twice from the app. |

---

## 18. Future Improvements

| Area | Suggestion |
|------|------------|
| **Caching** | Redis for dashboard summaries with short TTL; invalidate on record write. |
| **Indexing** | Compound indexes on `(user, isDeleted, date)` and `(user, category, type)`. |
| **Performance** | Projection-only fields in list APIs; cursor-based pagination for very large ledgers. |
| **Validation** | **Joi** / **Zod** at controller boundary; consistent error payload. |
| **Microservices** | Extract “analytics” service if pipelines grow; keep auth and CRUD monolith or use API gateway. |
| **Observability** | Structured logging, request IDs, metrics on aggregation latency. |
| **API consistency** | OpenAPI spec; unify `user` vs `userId` in code and BSON fields. |

---

## Appendix A — Codebase Alignment Checklist (Engineering)

When reviewing this repo against the documentation, verify and fix:

- **Model paths:** `app.js` and services should require the **same** user model filename (`user` vs `users`).  
- **Module system:** Prefer **either** CommonJS **or** ESM consistently; `routes/index.js` should not mix invalid `import` with `require`.  
- **Middleware exports:** `checkLogin` should export `isLoggedIn` (and optional alias `isloggedIn`); `checkRole` should export `checkRole` correctly.  
- **Record routes:** `export default router` must appear **after** all route definitions; avoid dead code below it.  
- **Field names:** Record schema **`Type` vs `type`**, **`user` vs `userId`** in filters and `$match` must match Mongo documents.  
- **Controller/service contracts:** e.g. `getTrendsService(userId, filter)` vs undefined `filter`; `getAdminService` must **`await`** aggregation; admin user summary function name **exported** vs **imported**.  
- **Users router:** Single spelling for `isLoggedIn`; delete-user handler should not reference undefined `role`.  
- **Dependencies:** `package.json` should include all strategies used (`passport-google-oauth20`, `cors`, `express-session`, etc.).

---

*End of document.*
