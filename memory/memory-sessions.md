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

## 2026-06-10 — Brand mark, mobile header CTA, SEO images

**Did:**
- Added an inline SVG brand mark (barber-pole stripes in a ring,
  `views/partials/logo.ejs`, currentColor so it works on paper and ink)
  to the header and footer brands; removed the old `brand__dot`.
- Added `public/img/favicon.svg` (ink tile, paper ring, brass stripes)
  and linked it from `head.ejs`; theme-color corrected to paper
  (`#fcfaf5`).
- Made the Book CTA visible in the mobile header (compact pill between
  brand and menu toggle) — it was burger-menu-only before. Hidden while
  the drawer is open (drawer has its own CTA).
- Set a real default `og:image` and JSON-LD `image`/`logo`
  (gallery 01.jpg / favicon.svg) in `src/lib/seo.js`.

**Left:**
- The real logo from sulminabarbershop.co.uk could not be fetched from
  the remote environment (host not in network allowlist; the shared
  Claude design link had expired with 404). The SVG mark is a
  brand-consistent stand-in. To swap in the real logo: replace the
  artwork in `views/partials/logo.ejs` and `public/img/favicon.svg`.

## 2026-06-10 (later) — Real logo + design-handoff booking flow

User supplied the actual logo PNG and the Claude Design handoff bundle.

**Did:**
- `public/img/logo.png` — real logo (white + amber, for ink surfaces).
  Footer now shows the actual PNG; JSON-LD `logo` points at it.
- `views/partials/logo.ejs` rewritten as the storefront mark from the
  logo (striped awning, door + scissors, base), currentColor neutrals
  so it adapts to paper/ink. Header lockup: SULMINA · mark ·
  BARBERSHOP in Oswald caps ("BARBERSHOP" hidden < 480px). Favicon
  rebuilt from the same mark.
- Booking flow now 4 steps per the design handoff (kept our correct
  data/engine; design's barbers/prices/address were wrong):
  Service (grouped by category) → Barber (cards: "Any available" ★ +
  the three barbers) → Time (unchanged grid + new "Jump to next
  opening" button on fully-booked days) → Details (build-up summary
  card with service/duration/price/barber/when).
- Entry links (home, services) route through `/book/barber` now.
- Step nav collapses inactive steps to numbered dots < 480px.

**Decisions:** kept light "Ink & Paper" palette (user preference) —
ported the design's flow, not its dark theme. Kept 7-day week strip
over the design's 14-day strip (lookahead is 28 days).

## 2026-06-10 (later still) — Full visual redesign pass

User judged the earlier polish "not good" and asked for a proper
redesign closer to the Claude Design handoff, kept in light mode.

**Did:**
- New typographic voice: Anton display caps (matches the logo
  lettering) for h1/h2/prices/date numerals; Manrope body; Fraunces
  italic accents (hours, quotes). Oswald removed.
- Home rebuilt to the handoff structure: full-bleed photo hero with
  outline-stroke second headline line + scroll cue, gold services
  marquee, story split with gold photo tag + stats row (3 chairs /
  7 days / 13 services), featured services as gold-accented cards on
  ink, gallery teaser grid, reviews band (kept Elfsight, light bg —
  widget assumes light), giant CTA band, contact strip.
- Shell: transparent-to-glass header (overlay on home, solid
  elsewhere), stacked brand lockup (mark + SULMINA / BARBERSHOP),
  gold underline nav states, numbered Anton mobile-menu links,
  4-column footer with giant ghost SULMINA wordmark.
- Interior pages got ghost words behind page titles; About bottom
  band became a CTA band with the gold story tag.
- Reveal-on-scroll via IntersectionObserver (gated behind html.js so
  no-JS users see everything; reduced-motion respected, marquee and
  cue animations disabled there).
- Services/menu rows: names now bold body face, prices Anton gold.

**Decisions:** kept light Ink & Paper palette and all correct shop
data; dark sections only as alternating bands. Booking flow untouched
from earlier today (4 steps), restyled for free via the type system.
