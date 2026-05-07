# Claude-Status — Sulmina Barbers

_Last updated: 2026-04-22 · End of Phase 1_

## End goal

Replace the current Wix template at sulminabarbershop.co.uk with a
mobile-first Node.js / Express / EJS / MongoDB Atlas booking site.
Must:

- Appeal to 12–40 year old male clientele.
- Feel premium and local, not templated.
- Accept customer bookings online with no double-bookings.
- Email confirmations to the customer and to the shop.

## Phase 1 — Foundation (done)

- Scaffold runs on Node 22+ with latest pinned deps:
  express 5.2.1, ejs 5.0.2, mongodb 7.1.1, nodemailer 8.0.5.
- No dotenv (Node's `--env-file`), no nodemon (Node's `--watch`),
  no body-parser (built into Express 5).
- `server.js` connects to Atlas before listening; logs the DB name on
  success; exits on failure.
- `src/config/shop.js` holds the knobs (barber count, opening hours,
  shop info).
- `src/data/services.js` holds the 13 real services with corrected
  spelling and accurate prices.
- `src/lib/mongo.js` owns the connection. Rejects a URI without a DB
  name so we can't accidentally write to Atlas's default `test` DB.
- `src/lib/email.js` scaffolded; throws if SMTP env vars are missing
  at send time. Unused until Phase 3.
- Minimal EJS views and CSS to prove wiring (home, 404, 500).
  Explicitly labelled as scaffold-only — Phase 2 replaces all of it.
- Project docs and memory files initialised.

## Next task — Phase 2 (design & pages)

1. Commit to one aesthetic direction and write design tokens.
2. Replace scaffold CSS with proper base / layout / components
   stylesheets. Mobile-first.
3. Build home, services, about, contact pages with real copy placeholders
   and real photos placeholders (owner to supply actual content).
4. Break the block-by-block rhythm — at least one asymmetric moment per
   page.
5. Book links point to `/book` stubs that say "booking coming in Phase 3".

## Phase 3 — Booking flow & Mongo writes

- `bookings` collection schema: `_id`, `barberId` (1…3), `serviceSlug`,
  `serviceDuration`, `startAt`, `endAt`, `customerName`,
  `customerEmail`, `customerPhone`, `notes`, `createdAt`.
- Compound index `{ barberId: 1, startAt: 1 }` for fast overlap queries.
- Pure availability function — `(date, service, bookings) → slots`.
  No Express, no Mongo inside the function itself.
- Atomic booking write in a transaction: re-check availability against
  live DB, insert or throw.
- Nodemailer wiring: one customer email, one shop email, per confirmed
  booking.

## Phase 4 — Polish & deploy

- LocalBusiness JSON-LD, sitemap, robots.
- Accessibility + Lighthouse pass.
- Deployment target decision (Render / Railway / Fly / VPS).

## Open items (non-blocking)

1. Shop email address (for `SHOP_EMAIL`) — needed before Phase 3.
2. Gmail App Password for SMTP — needed before Phase 3.
3. Real photography — needed during Phase 2 to replace placeholders.
4. Real About copy from the owner — needed during Phase 2.
5. Domain decision — keep sulminabarbershop.co.uk or move — Phase 4.

## Known deferred problems

- `MONGODB_URI` still to be supplied by user. App won't boot without it.
- Phase 1 home page is deliberately ugly / under-designed. That's fine —
  we haven't committed to a design direction yet.

## Booking rule (authoritative — also in Architecture.md)

A proposed booking of service S, duration D, starting at time T on
barber B is valid when **all** of these hold:

1. `T ≥ openingTime` of that day.
2. `T + D ≤ closingTime` of that day.
3. `T ≥ previousBookingEnd` on barber B (back-to-back allowed).
4. `T + D ≤ nextBookingStart` on barber B (back-to-back allowed).

Three barbers, checked independently. First barber with a valid slot at
the requested time wins.
