# Architecture — Sulmina Barbers

## Purpose

Preserve the "why" of structural decisions so they survive debugging
sessions that zoom into unrelated bugs. Flag inconsistencies. Identify
components that may eventually become standalone libraries.

## One-line shape

Express app renders EJS pages, reads and writes to a MongoDB Atlas
cluster, dispatches booking confirmation emails via SMTP. No
client-side framework, no build step, no TypeScript.

## Request lifecycle

```
Browser
  → Express (server.js)
      → shared locals (shop, hours, currentPath) middleware
      → router: pages (Phase 2: + booking)
          → renders EJS view with data from src/config, src/data, or src/lib
      → static: /public/*
```

## Boot lifecycle

```
node --env-file=.env --watch server.js
  → process.env populated (Node native)
  → mongo.connect() resolves or process exits(1)
  → app.listen() binds PORT
```

Mongo connects before the listener binds. An app with no DB has no
meaningful behaviour, so we fail at boot instead of on first request.

## Module boundaries

| Module | Owns |
|--|--|
| `server.js`             | Express wiring, boot sequence, 404/500 |
| `src/config/shop.js`    | Knobs: barber count, hours, shop metadata |
| `src/data/services.js`  | Service catalogue — single source of truth |
| `src/lib/mongo.js`      | DB connection, lifetime, graceful close |
| `src/lib/email.js`      | SMTP wrapper, fail-loud on missing creds |
| `src/routes/pages.js`   | Marketing pages |
| `views/partials/`       | Head / header / footer — shared shell |
| `public/css/`           | Stylesheets (Phase 2: tokens / layout / components) |

Routes own URL prefixes. Data modules are never imported directly by
views — always through a route's render call.

## Authoritative booking rule

A proposed booking of service S, duration D, starting at time T on
barber B is valid when **all** of these hold:

1. `T ≥ openingTime` of that day.
2. `T + D ≤ closingTime` of that day.
3. `T ≥ previousBookingEnd` on barber B (back-to-back allowed).
4. `T + D ≤ nextBookingStart` on barber B (back-to-back allowed).

Three barbers, checked independently. First barber with a valid slot at
the requested time is assigned. No before-buffer. No after-buffer.
Closing time is a hard boundary, not a buffered one.

## Key design decisions

### 1. MongoDB Atlas with transactions
Atlas free tier supports transactions. The booking write re-runs the
availability check against live DB state inside a transaction — so the
UI's stale availability view can never cause a double-booking. The DB
is the final authority on "is this slot free."

### 2. Services catalogue as JS module, not a collection
The catalogue is small, changes rarely, and is read by pages, booking
logic, and email templates. Keeping it as a plain module means one
edit, one redeploy, zero migrations. **Trigger to revisit:** frequent
price changes, per-barber pricing, or time-limited promotions.

### 3. EJS, plain CSS, no build step
Seven-page content site. Design tokens plus three stylesheets will be
easier to reason about than utility-soup framework markup, and the
stack stays transparent — no webpack, no transpiler, no TypeScript.
**Trigger to revisit:** booking UI needing real client-side state
beyond a date-time picker.

### 4. Guest bookings, no accounts
Friction hurts conversion more than account history helps a
neighbourhood shop. The owner already holds regulars in memory; we're
not building a CRM.

### 5. No before-buffer, no after-buffer
Back-to-back means back-to-back. Three checks, four when you count the
opening/closing bounds. Simpler than a buffered rule, and the barbers
can manage their own pacing.

### 6. Fail-loud on missing env
`mongo.connect()` throws if `MONGODB_URI` is absent. `email.sendMail()`
throws if SMTP vars are absent. No dev-mode loggers, no silent
fallbacks — we never want to ship a build where confirmations are
quietly broken.

### 7. No dotenv, no nodemon, no body-parser
Node 20.6+ has native `--env-file`. Node 22+ has stable `--watch`.
Express 5 has body-parser built in. Each of these removed a dependency
and a config surface. Fewer moving parts.

## Components that could become libraries

- **`src/data/services.js`** — generalise to a "shop catalogue" module
  (service + price + duration + category) for any appointment-based
  small business.
- **Availability engine (Phase 3)** — the function that maps
  `(opening hours + service duration + existing bookings)` to bookable
  slots is the most reusable piece here. Keep it pure (no Express, no
  Mongo, no Date-formatting libraries inside it) so extraction is
  trivial later.
- **`src/lib/email.js`** — generic fail-loud SMTP wrapper. Keep the
  surface minimal.
- **`src/lib/mongo.js`** — generic one-connection-per-process
  Mongo wrapper with graceful shutdown.

## Known inconsistencies / tech debt

- **Service slugs vs booking references.** Once the `bookings`
  collection exists, bookings will reference service slugs as strings.
  There is no foreign-key enforcement; the integrity contract is
  "never rename or delete a service slug that has past bookings." This
  will be enforced by convention, not by code, and will be documented
  alongside the first migration.

- **Hardcoded shop info.** Shop name, address, phone and opening hours
  live in `src/config/shop.js` as code. If the shop ever moves or
  changes hours, it's a code change plus redeploy. Acceptable for a
  single-location site; revisit if Sulmina opens a second branch.

## Out of scope (deliberate, not oversight)

- Staff accounts, admin dashboard
- Payments or deposits
- SMS reminders
- Customer loyalty / repeat detection
- Multi-location support
- i18n

Revisit only if asked.
