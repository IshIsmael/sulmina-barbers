# Sulmina Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Sulmina Barber Shop site into the approved A/C hybrid design while preserving a complete, reliable mobile-first booking flow and strengthening local SEO/AEO.

**Architecture:** Keep the current Express/EJS/no-build architecture. Replace the visual system through focused EJS template changes and rewritten CSS tokens/components, while preserving existing routing, service data, availability logic, Mongo booking writes, and email flow.

**Tech Stack:** Node 22+, Express 5, EJS, vanilla CSS/JS, MongoDB Atlas, Nodemailer, Render.

---

## File Structure

- Modify `views/partials/head.ejs`: metadata, color-scheme/theme, preload strategy, font loading.
- Modify `views/partials/header.ejs`: compact global shell and mobile menu content.
- Modify `views/partials/footer.ejs`: local SEO/footer structure.
- Modify `views/home.ejs`: full homepage rhythm.
- Modify `views/services.ejs`: services price-board layout and SEO content.
- Modify `views/about.ejs`: local story and proof layout.
- Modify `views/gallery.ejs`: stable gallery structure.
- Modify `views/contact.ejs`: contact/location page.
- Modify `views/booking/*.ejs`: booking cards, controls, summary, validation, confirmation/conflict states.
- Modify `public/css/base.css`: tokens, reset, type, global texture.
- Modify `public/css/layout.css`: shell, containers, page rhythm.
- Modify `public/css/components.css`: hero, services, story, gallery proof, contact, forms, footer components.
- Modify `public/css/booking.css`: mobile-first booking system.
- Modify `public/css/gallery.css`, `public/css/reviews.css`: align special sections.
- Modify `public/js/app.js`: menu accessibility and robust state.
- Modify `public/js/booking-time.js`: preserve fragment swap and improve busy/focus state if needed.
- Modify `src/lib/seo.js`: richer metadata and structured data.
- Modify `src/routes/pages.js`: pass route locals needed for SEO and page sections.
- Add optional generated/textural assets only if needed under `public/img/`.

## Task 1: Preserve Behavior With Baseline Checks

- [ ] **Step 1: Run existing availability tests**

Run:
```powershell
node _test\availability.test.js
```

Expected: `14 passed, 0 failed`.

- [ ] **Step 2: Inspect current route/template map**

Run:
```powershell
rg "router.get|res.render|include\\(" server.js src views
```

Expected: output lists all page routes and booking templates.

- [ ] **Step 3: Keep booking internals unchanged**

Implementation rule: do not change `src/lib/availability.js`, `src/lib/bookings.js`, or `src/data/services.js` unless a verified booking bug requires it.

## Task 2: Rebuild SEO And Structured Data

- [ ] **Step 1: Update metadata model in `src/lib/seo.js`**

Implement richer page descriptions, stable canonical URLs, `HairSalon` JSON-LD, and optional services JSON-LD derived from `SERVICES`.

- [ ] **Step 2: Update `src/routes/pages.js` locals**

Pass FAQ/service/local proof locals where needed, keeping route responsibilities simple.

- [ ] **Step 3: Verify generated SEO routes**

Run:
```powershell
node -c src\lib\seo.js
node -c src\routes\pages.js
```

Expected: no syntax errors.

## Task 3: Replace Global Design Tokens And Shell

- [ ] **Step 1: Rewrite `public/css/base.css` tokens**

Implement approved tokens: black-green lacquer, smoked charcoal, bone, brass, oxblood, type scale, safe header variables, focus states, texture overlays, and reduced-motion behavior.

- [ ] **Step 2: Rewrite `public/css/layout.css` shell**

Implement compact header, solid mobile menu, container rhythm, dark/bone page bands, footer, and page heads.

- [ ] **Step 3: Update `views/partials/head.ejs`, `header.ejs`, and `footer.ejs`**

Make the shell match the new design system and keep nav labels: Services, About, Gallery, Contact, Book.

- [ ] **Step 4: Syntax check templates by requiring route modules**

Run:
```powershell
node -c server.js
```

Expected: no syntax errors.

## Task 4: Redesign Marketing Pages

- [ ] **Step 1: Rework `views/home.ejs`**

Use the approved rhythm: image-led hero, service proof strip, price-board services, story/photo, gallery proof, reviews fallback, booking CTA, contact strip.

- [ ] **Step 2: Rework `views/services.ejs`**

Use a premium price-board list grouped by real categories, with duration/price/description and booking links.

- [ ] **Step 3: Rework `views/about.ejs`**

Use local shop story, real photos, shop facts, and booking CTA.

- [ ] **Step 4: Rework `views/gallery.ejs` and `views/contact.ejs`**

Use stable gallery tiles and a contact page with map, hours, phone, address, Instagram, and booking CTA.

- [ ] **Step 5: Rewrite `public/css/components.css`, `gallery.css`, `reviews.css`**

Implement shared components without generic card grids or decorative side stripes.

## Task 5: Redesign Booking Flow

- [ ] **Step 1: Rework booking step templates**

Modify:
```text
views/booking/select-service.ejs
views/booking/select-barber.ejs
views/booking/select-time.ejs
views/booking/_time-grid.ejs
views/booking/details.ejs
views/booking/conflict.ejs
views/booking/confirmation.ejs
```

Keep the same routes and query parameters.

- [ ] **Step 2: Rewrite `public/css/booking.css`**

Implement a mobile-first booking app surface: safe step nav, horizontal barber/date rails, readable time slots, sticky summary, accessible form states, conflict/confirmation receipts.

- [ ] **Step 3: Preserve progressive enhancement**

Keep `public/js/booking-time.js` fragment swap behavior and ensure focus moves to the refreshed slot region.

- [ ] **Step 4: Verify availability tests again**

Run:
```powershell
node _test\availability.test.js
```

Expected: `14 passed, 0 failed`.

## Task 6: Render And Responsive QA

- [ ] **Step 1: Start local server**

If a valid `.env` with `MONGODB_URI` is available:
```powershell
npm start
```

If production secrets are unavailable, create a temporary smoke strategy outside committed source or verify server-rendered pages through direct route rendering without committing secrets.

- [ ] **Step 2: Use Browser/IAB for visual QA**

Check:
```text
/
/services
/about
/gallery
/contact
/book
/book/barber?service=skin-fade
/book/time?service=skin-fade&barber=any
/book/details?service=skin-fade&barber=any&slot=<valid slot>
```

Viewports:
```text
320x740
390x844
768x1024
1440x1000
```

- [ ] **Step 3: Interaction QA**

Verify:
- mobile menu opens/closes and focus remains usable.
- service selection navigates to barber step.
- barber selection navigates to time step.
- date/barber changes swap the time grid without console errors.
- detail form validation shows readable errors.
- sticky CTA/summary never covers final controls.
- no horizontal overflow.

- [ ] **Step 4: SEO QA**

Verify HTML source for:
- unique title and description.
- canonical.
- robots meta only where expected.
- JSON-LD parseable.
- sitemap and robots routes.

## Task 7: Final Verification And Handoff

- [ ] **Step 1: Run syntax and unit checks**

Run:
```powershell
node -c server.js
node -c src\lib\seo.js
node -c src\routes\pages.js
node -c src\routes\booking.js
node _test\availability.test.js
```

Expected: syntax checks exit 0; availability reports `14 passed, 0 failed`.

- [ ] **Step 2: Inspect git diff**

Run:
```powershell
git -c safe.directory=C:/Users/adame/OneDrive/Documents/Sulmina diff --stat
git -c safe.directory=C:/Users/adame/OneDrive/Documents/Sulmina diff --check
```

Expected: no whitespace errors; diff only contains redesign-related files plus docs.

- [ ] **Step 3: Completion audit**

Compare current evidence against the objective:
- complete redesign of all public pages.
- booking flow works completely.
- mobile-first with no offscreen/squished controls.
- SEO/GEO/AEO strengthened.
- production-ready on current stack and Render-friendly.
- visual QA against A/C hybrid reference.

