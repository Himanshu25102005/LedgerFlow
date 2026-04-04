# LedgerFlow Backend — Product & Engineering Review

**Scope:** Analysis of the backend against the finance-dashboard assignment guidelines. No code was modified as part of producing this document.

**Note:** The assignment rubric was provided in the project brief. `Backend_Doc.md` is treated as the intended design doc and is compared to what the code actually does.

---

## Executive summary

LedgerFlow’s backend is **aiming at the right product**: MongoDB + Mongoose, Passport sessions, roles (`viewer` / `analyst` / `admin`), financial records with soft delete, and dashboard/admin aggregations. On paper this maps well to the assignment.

In **current form the implementation does not reliably run or behave as documented**. There are **blocking dependency and module-system issues**, **several broken routes and controllers**, **schema vs query field mismatches** (`Type` vs `type`, `user` vs `userId`), and **documentation that overstates what works**. Treat this as a **strong skeleton with significant integration and correctness debt**, not a submission-ready backend until those are fixed.

---

## Guideline compliance matrix

| Requirement | Status | Notes |
|-------------|--------|--------|
| **1. User & role management** | **Partial** | User model has `role`, `status`, registration/login paths exist. Listing users, role change, status change, delete are **intended** in `users.js` but **implementation is broken** in places (see errors). **No consistent admin-only gate** on “list all users” (any logged-in user can hit `/users/api/user`). |
| **2. Financial records CRUD + filters** | **Partial (logic broken)** | Services/controllers exist for create, list, update, soft delete, get-by-id. **Filters, ownership, and field names are inconsistent** with the schema, so many operations will not match documents or return wrong data. |
| **3. Dashboard summary APIs** | **Partial (logic broken)** | User summary, categories, trends, admin summary/categories/trends/user-summary are **sketched**. Several aggregations use **wrong field names**, **missing `await`**, or **invalid pipeline variables**—so numbers can be wrong or endpoints can throw. |
| **4. Access control** | **Partial** | `checkRole` middleware concept is right; **middleware file is broken** (`export default rbac` where `rbac` is undefined). **Record list** wires `checkRole` incorrectly (handler passed as second argument). **Viewers** are effectively **excluded from GET `/api/records`** (only `admin`/`analyst`), while **POST create** has **no role restriction**—opposite of typical “viewer read-only” spec unless you document that as an explicit choice. |
| **5. Validation & error handling** | **Weak** | Some service checks exist; controllers mostly return **500** for all failures. **Global error handler renders HTML** (`error.ejs`), which is **poor for a JSON API**. |
| **6. Data persistence** | **Met (MongoDB)** | `config/db.js` + Mongoose is appropriate. **Duplicate `connectDB()`** in `app.js` is redundant noise. |

### Optional enhancements (from brief)

| Enhancement | Status |
|-------------|--------|
| Token/session auth | **Sessions + Passport local** present; Google OAuth **coded** but depends on missing packages and correct env. |
| Pagination | **Partial** on records/users/admin trends (where code runs). |
| Search | **Missing** (no text/search endpoint). |
| Soft delete | **Modeled** (`isDeleted`); queries **must** consistently filter it (list currently may not). |
| Rate limiting | **Missing**. |
| Tests | **Not seen** in reviewed files. |
| API documentation | **`Backend_Doc.md` is detailed** but **not aligned** with runnable code (see below). |

---

## Critical errors and risks (blocking or severe)

### 1. Application bootstrap

- **`package.json` does not list** `cors`, `express-session`, or `passport-google-oauth20`, but **`app.js` and `routes/auth.js` require them**. Loading the app fails immediately (e.g. `Cannot find module 'cors'`).
- **`connectDB()` is called twice** in `app.js` (harmless but sloppy).
- **`app.use("/", indexRouter)` is duplicated**.

### 2. Module system chaos (CommonJS vs ESM)

Much of the codebase mixes **`import` / `export`** with **`require` / `module.exports`** without `"type": "module"` in `package.json`. That is **not valid in plain Node** for those files as written. Examples:

- `routes/index.js`: invalid line `import {checkRole} from ("../middlewares/rbac")` (wrong syntax, wrong path).
- `models/user.js`: duplicate `plm` binding (`import plm` and `const plm = require(...)`).
- `models/record.js`: ESM `import` + CJS `module.exports`.
- Controllers/services: `export const` while the rest of the app uses `require`.

**Net:** Even after installing missing npm packages, **many modules may still fail to load** until the project is **consistently CJS or ESM**.

### 3. Wrong or missing model paths

- **`app.js`** requires `./models/user` (file **`user.js`** exists).
- **`routes/users.js`**, **`routes/auth.js`**, **`routes/record.routes.js`**, **`routes/dashboard.route.js`** reference **`../models/users`** (that path **does not exist**).

### 4. Middleware

- **`middlewares/checkLogin.js`** defines `isLoggedIn` but **does not export** it. Routes that `import { isloggedIn } from "../middlewares/checkLogin"` will fail or get `undefined`.
- **`middlewares/checkRole.js`** ends with **`export default rbac`** but **`rbac` is never defined**—syntax/runtime failure. Named imports like `import { checkRole }` also **do not match** a default export.

### 5. User routes bugs (`routes/users.js`)

- **`PATCH /api/users/:id/status`** uses **`isLoggedIn`**; the import is **`isloggedIn`** → **ReferenceError** when that route is hit.
- **`DELETE /api/users/:id`** checks **`allowedRoles.includes(role)`** but **`role` is undefined** (copy-paste bug)—wrong logic and possible crashes.

### 6. Record routes (`routes/record.routes.js`)

- **`checkRole(["admin", "analyst"], getRecordController)`** is incorrect: **`checkRole` should return one middleware**; the controller should be **separate** in the chain. As written, **Express will not invoke `getRecordController` correctly**.
- **`export default router` appears before** the **`GET /api/records/:id`** route → that route is **dead code** (never registered on the exported router in a normal build).

### 7. Dashboard routes (`routes/dashboard.route.js`)

- File **does not export** the router (`module.exports` / `export default`), so it **cannot be mounted** from `app.js` as-is.
- **`app.js` does not mount** record or dashboard routers at all—so **core APIs may be unreachable** even if files were fixed.

### 8. Controllers (`dashboard.controller.js`)

- **`getTrendsController`**: uses **`filter`** which is **not defined** → **ReferenceError**.
- **`getAdminController`**: **`getAdminService()` not awaited** → response will not be the aggregation result.
- **`getAdminByCategoryController`**: **`getAdminByCategoryService()` not awaited**.

### 9. Services — schema vs code mismatches (functional correctness)

**Record schema** uses:

- Field **`Type`** (capital T), not `type`.
- Owner field **`user`**, not `userId`.

**But** much of the code uses **`type`** and **`userId`** in queries and `$match`:

- **`createRecordService`**: passes `type` into `create`—does not align with **`Type`** in schema (you may get **no `Type` set** or inconsistent documents depending on strictness).
- **`getRecordService`**: `filter.userId` and `filter.type` → **wrong field names**; **`isDeleted: false` not applied** → soft-deleted rows may appear.
- **`updateRecordService` / `softDeleteRecordService` / `getRecordByIdService`**: query uses **`userId`**; schema has **`user`** → updates/deletes/fetches **will not find** the document. **`getRecordByIdService`** expects an **object** `{ recordId, userId }` but the controller calls **`getRecordByIdService(id, userId)`** (positional args) → **broken**.
- **`dashboard.service.js`**: `getSummaryService` / category pipelines use **`$type`** and **`type:`** in `$match`, not **`Type`** → **income/expense sums likely always zero** for correctly stored docs.
- **`getTrendsService`**: `$match` uses **`userId`** → should be **`user`**.
- **`getAdminService`**: `recordSchema.aggregate(...)` **missing `await`**; several `$cond` branches use **`$amount` without quotes** (invalid as a field path in aggregation)—likely **runtime errors** or wrong behavior.
- **`getAdminByCategoryService`**: **`$divide` references `totalExpense`** which is **not a defined field** in that stage → **pipeline error**.
- **`getUsersSummaryService`** groups by **`$userId`**; documents use **`user`**. Controller imports **`getUserSummaryService`** but service exports **`getUsersSummaryService`** → **import mismatch**.

### 10. Record controller vs routes

- Route: **`PATCH /api/records/:recordId`**; controller reads **`req.params.id`** → **undefined** → updates target the wrong id.

### 11. Security / ops

- **Session secret** hardcoded as `"your_secret_key"` in `app.js` (should be env-only for anything beyond local demo).
- **`.env` in the repo** is a risk if it contains real secrets.
- **Port confusion**: `bin/www` defaults to **3000**; Google callback URL in `auth.js` uses **5000**—easy misconfiguration with the Next.js frontend also on 3000.

---

## Assessment vs evaluation criteria (brief)

1. **Backend design** — **Good intent** (routes → middleware → controller → service → model), but **inconsistent module boundaries**, **circular import** (`record.service.js` importing a controller), and **unmounted routers** undermine the design.
2. **Logical thinking** — RBAC and aggregations show **right ideas**; **field naming and wiring bugs** break the logic chain.
3. **Functionality** — **Cannot certify working**; multiple paths would **throw** or return **wrong aggregates**.
4. **Code quality** — **Uneven**: typos (“Noo fields”, “authoriaztion”), duplicate code, mixed styles, dead code after `export default`.
5. **Data modeling** — **Reasonable shape** (user, record, soft delete), but **`Type` vs `type`** and **`user` vs `userId`** need **one canonical model** used everywhere (including aggregations).
6. **Validation & reliability** — **Needs tightening**: 4xx vs 5xx, JSON error shape, and **API-safe** global handler.
7. **Documentation** — **`Backend_Doc.md` is strong as a narrative**, but the **appendix checklist** already hints at drift; **treat the doc as target state**, not as-built.
8. **Thoughtfulness** — **Soft delete**, **facet pagination**, and **admin rollups** are good differentiators **once they execute correctly**.

---

## Documentation gap

`Backend_Doc.md` describes a cohesive system (Google OAuth, mounted `/api/*` paths, aligned field names, working middleware exports). The **actual codebase diverges** in the error list above—especially **dependencies**, **ESM/CJS**, **model path `user` vs `users`**, **dashboard/record routers not mounted**, and **aggregation field names**.

---

## Recommendations (prioritized)

**P0 — Make it run**

1. Add **all** runtime dependencies to `package.json` (`cors`, `express-session`, `passport-google-oauth20`, etc.).
2. Pick **one** module system (**all CommonJS** is the smallest change for this Express app) and **convert** mixed files.
3. Fix **broken syntax** (`routes/index.js`, `checkRole.js`, `user.js` model).
4. **Export** middleware correctly; fix **`checkRole` usage** on record routes; **move `export default router`** after all routes.
5. **Mount** `record` and `dashboard` routers in `app.js` with a **single documented prefix** (e.g. `/` vs `/api`).

**P1 — Make data correct**

6. Normalize schema: use **`type`** (lowercase) **or** **`Type`** everywhere—in **Mongoose, CRUD, and every `$match` / `$cond`**.
7. Use **`user`** (ObjectId ref) **everywhere** for ownership; remove **`userId`** from queries unless it exists on the document.
8. Add **`isDeleted: false`** to **all** non-admin read paths that should hide deleted rows.

**P2 — Assignment fit**

9. Reconcile **viewer** behavior with the brief: either **allow viewers to read their own records** and **forbid mutations**, or document the opposite as an explicit product decision.
10. Restrict **user directory** endpoints to **admin** (or analyst if that is intended).
11. Return **proper HTTP codes** (400 validation, 404 not found) and a **consistent JSON error** body; use **`next(err)`** with an API error handler instead of only EJS for API routes.

**P3 — Polish**

12. Add **OpenAPI** or Postman collection once routes stabilize.
13. Add **indexes** (`user + isDeleted + date`, etc.) as your doc suggests.
14. Add **tests** for RBAC and one aggregation per dashboard endpoint.

---

## Frontend suggestions (for when you build it)

- **Auth**: With **cookie sessions**, the SPA must use **`fetch(..., { credentials: 'include' })`** and align **origin** with CORS (`http://localhost:3000` is already set in `app.js`—ensure API port and OAuth redirect URLs match).
- **Contract**: Define **one** API base path (`/users/api/...` vs `/api/...`) after you fix mounting—today the doc and `app.js` disagree.
- **Role-based UI**: Hide create/edit/delete for **viewer**; show **admin** analytics only when `role === 'admin'` (and optionally analyst sections).
- **Error handling**: Expect **JSON** `{ message }` or `{ error }` from API routes; handle **401/403** for session expiry and inactive users.

---

## Bottom line

You have **the right feature outline** for the finance-dashboard assignment: **MongoDB persistence, roles, records with soft delete, and aggregation-style dashboard APIs**. The **`Backend_Doc.md`** reads like a solid submission narrative.

The **implementation is not yet at the same level as the doc**: the server **does not start** without missing packages, **multiple files would fail to load** due to ESM/CJS and export bugs, **routers for records and dashboard are not integrated** in `app.js`, and **schema field names and several controllers/services are internally inconsistent**, which would make **CRUD and dashboards unreliable even after boot fixes**.

**Suggested narrative for evaluators (once fixed):** “Finance ledger API with session auth, RBAC, soft-deleted transactions, user-scoped and admin aggregations in MongoDB.” Until the P0/P1 items are addressed, lead with honesty: **work in progress, doc describes target architecture**.
