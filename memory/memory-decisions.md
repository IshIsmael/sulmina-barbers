# memory-decisions.md

Dated log of architectural and product decisions. Newest at top. Each
entry: **what** was decided, **why**, what the alternative was.

---

## 2026-04-22 — Node 22+ with native `--env-file` and `--watch`

**What:** Engines = `>=22`. No dotenv, no nodemon.
**Why:** Node 20.6+ has `--env-file`; Node 22+ has stable `--watch`.
Each removed a dependency and a config surface.
**Alternative:** Keep dotenv + nodemon. Rejected — more code, more deps.

## 2026-04-22 — CommonJS, not ESM

**What:** `"type": "commonjs"` in package.json. `require` and
`module.exports` throughout.
**Why:** Simpler for this project size. `__dirname` works out of the
box. No `.mjs` extension dance. Every Express/EJS example in the docs
is CJS.
**Alternative:** ESM. Rejected — introduces friction (path resolution
via `import.meta.url`, explicit `.js` in imports, top-level await) for
no benefit on a single-process app of this scale.

## 2026-04-22 — Pinned latest stable versions

**What:** express 5.2.1, ejs 5.0.2, mongodb 7.1.1, nodemailer 8.0.5.
**Why:** User asked for the latest. Express 5 is now the default on
npm; Mongo driver 7 requires Node 20.19+, which Node 24 satisfies.
**Alternative:** Express 4 (older but more tutorials). Rejected —
project is new, no migration cost, v5 is where the ecosystem is moving.

## 2026-04-22 — Services catalogue as JS module

**What:** `src/data/services.js` is the single source of truth for
services, prices, durations.
**Why:** Catalogue is small and changes rarely. Read by pages, booking
logic, and emails. Plain module = one edit, one redeploy, no migration.
**Alternative:** MongoDB collection. Rejected at current scale.
**Trigger to revisit:** frequent price changes, per-barber pricing,
time-limited promotions.

## 2026-04-22 — Mongo connect before listen

**What:** `server.js` awaits `mongo.connect()` before `app.listen()`.
Exits with code 1 on failure.
**Why:** App has no meaningful behaviour without the DB. Fail at boot
rather than on first request.
**Alternative:** Lazy connect on first use. Rejected — turns startup
failures into runtime surprises.

## 2026-04-22 — Reject URI without DB name

**What:** `mongo.connect()` throws if the URI resolves to Atlas's
default `test` database.
**Why:** Silent writes to the wrong DB are one of the worst failure
modes. Fail loud at startup.
**Alternative:** Accept any DB. Rejected.

## 2026-04-22 — Fail-loud email

**What:** `email.sendMail()` throws if `SMTP_HOST`, `SMTP_USER`,
`SMTP_PASS` are missing at send time.
**Why:** Aligns with "no fallbacks / fail fast." Prevents shipping a
build where booking confirmations are silently disabled.
**Alternative:** Dev-mode console logger. Rejected.

## 2026-04-22 — 3 barbers, constant in config

**What:** `BARBER_COUNT = 3` in `src/config/shop.js`.
**Why:** User confirmed 3. Wanted it trivially changeable.
**Alternative:** DB collection of barbers with names / photos.
Deferred until the owner wants barber-specific booking.

## 2026-04-22 — No before-buffer, no after-buffer

**What:** Booking rule is just "don't overlap":
- `T ≥ openingTime`
- `T + D ≤ closingTime`
- `T ≥ previousBookingEnd`
- `T + D ≤ nextBookingStart`
Closing time is a hard boundary, not buffered.

**Why:** User confirmed explicitly after working through the logic.
Back-to-back bookings allowed. Barbers manage their own pacing.
**Alternative:** Fixed 30-min cushions, or dynamic-duration cushions.
Rejected after walk-through; simpler rule chosen.

## 2026-04-22 — Guest-only booking, no accounts

**What:** No login, no customer accounts. All bookings are guest-flow.
**Why:** Friction hurts conversion more than account value helps a
small shop.
**Alternative:** Optional magic-link login. Deferred.

## 2026-04-22 — Plain CSS, mobile-first, no framework

**What:** Hand-authored CSS with design tokens (Phase 2). No Tailwind.
**Why:** Seven-page site; tokens + three stylesheets are easier to
reason about than utility soup. No build keeps the stack transparent.
**Alternative:** Tailwind. Rejected for this project size.
