# memory-sessions.md

Append a dated entry per substantive session. Terse — "did X, left Y in
this state."

---

## 2026-04-22 — Phase 1 scaffold

**Did:**
- Searched npm for current latest versions; locked: express 5.2.1,
  ejs 5.0.2, mongodb 7.1.1, nodemailer 8.0.5, Node 22+.
- Dropped dotenv (Node native `--env-file`), dropped nodemon (Node
  native `--watch`), dropped body-parser (Express 5 built-in).
- Created project skeleton: `server.js`, `src/{config,data,lib,routes}`,
  `views/partials`, `public/css`, `memory/`.
- `src/config/shop.js` — knobs: barber count (3), opening hours, shop
  meta. Frozen objects so no runtime mutation.
- `src/data/services.js` — 13 services with corrected spelling
  ("beard" not "bread"), UK-formatted prices.
- `src/lib/mongo.js` — single connection, throws on missing URI,
  throws on default `test` DB to prevent silent wrong-DB writes.
- `src/lib/email.js` — SMTP wrapper, throws on missing creds. Unused
  until Phase 3.
- Minimal EJS views + minimal base.css to prove wiring. Labelled as
  scaffold-only.
- Docs: `README.md`, `Claude-README.md`, `Claude-Status.md`,
  `Architecture.md` (booking rule verbatim inside).
- Memory files initialised with everything locked in so far.

**Left:**
- User needs to paste `MONGODB_URI` into `.env` to boot.
- Phase 1 home page is deliberately under-designed; Phase 2 replaces
  all CSS.
- Shop email + Gmail App Password still pending from user.

**Next:** Phase 2 — aesthetic direction + design tokens, then build
home / services / about / contact pages.
