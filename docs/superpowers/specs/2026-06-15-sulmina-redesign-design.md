# Sulmina Redesign Design Spec

## Brief

Designing the Sulmina Barber Shop website for local Southgate customers on web and mobile. The primary user goal is to choose a service, pick a barber or the next free chair, choose a time, and confirm a booking without layout friction. The tone is opulent, tactile, refined, and street-level: a premium local barbershop, not a generic black-gold template. The main risk is visual drama making the booking flow cramped, low contrast, or hard to finish on a phone.

## Approved Direction

Build target: **A/C hybrid, "Midnight Atelier / Brass Street Club"**.

Primary reference direction:
- Dark black-green lacquer canvas.
- Real haircut photography as the proof layer.
- Metallic brass used sparingly for primary CTAs, active states, dividers, and small ornamental details.
- Tactile material language: leather grain, concrete, brushed brass, matte paper receipt surfaces.
- Large, confident typography with readable body copy and restrained condensed display use.

Borrowed details:
- From Direction C: denser mobile booking controls, stronger barbershop/street identity, price-board service lists.
- From Direction B: organic contour linework and hand-cut shapes as supporting decoration only.

Reject:
- Beige spa look.
- Generic luxury hotel styling.
- Purple or indigo.
- Emoji icons.
- Decorative side accent stripes.
- Card grids as default structure.
- Unreadable condensed paragraphs.
- Booking controls that require horizontal precision on small phones.

Concept references:
- `C:\Users\adame\.codex\generated_images\019ec8f0-c586-7bc0-9328-3ec3b25fa22d\ig_02512c2479325947016a2f634c1d2c81918f42b771ffdbac32.png`
- `C:\Users\adame\.codex\generated_images\019ec8f0-c586-7bc0-9328-3ec3b25fa22d\ig_02512c2479325947016a2f63a462a481918d684d4c53ab6265.png`
- `C:\Users\adame\.codex\generated_images\019ec8f0-c586-7bc0-9328-3ec3b25fa22d\ig_02512c2479325947016a2f640a6fa08191942d3068fed82af6.png`

## Design System

### Tokens

- Background: near-black forest lacquer for the primary site canvas.
- Surface: smoked charcoal for subtle layers; bone paper for long reading, forms, receipts, and SEO-rich content.
- Text: bone on dark, near-black on bone, never pale grey for body copy.
- Accent: metallic brass for action and active state only.
- Selection/error: oxblood for selected booking slot and validation/error only.
- Border: low-contrast brass or bone hairlines depending on surface.
- Radius: mostly 0-10px; large soft blobs are decorative shape masks only, not component corners.
- Shadow: dark surfaces use borders and brass glints more than heavy shadows; bone surfaces can use soft grounded shadows.

### Typography

- Keep the logo-inspired condensed display voice, but limit it to H1/H2, price numerals, and short labels.
- Use Manrope or the existing sans for body, controls, forms, and booking details.
- Body text remains 16px minimum, with 1.5+ line-height.
- Uppercase labels require positive letter spacing.
- Use `text-wrap: balance` on headings and `text-wrap: pretty` on longer editorial copy.
- Avoid all-caps paragraphs and cramped navigation text.

### Visual Motifs

- Brass etched line illustrations for scissors, razor, awning, towel, bottle, and map pin motifs.
- Real haircut photos are cropped in strong, stable frames with clear faces/hair and no weak abstract placeholders.
- Organic contour lines appear as low-opacity support graphics, never behind critical text.
- Services use a premium price-board/list model rather than generic cards.
- Booking summary uses a tactile receipt/ledger model.

## Page Requirements

### Global Shell

- Fixed header must remain compact and readable at 320px.
- Mobile header must keep `Book` one tap away without squeezing the logo or menu.
- Mobile menu must be a solid dark takeover with visible close control, tap-safe links, phone, address, and hours.
- Footer must include brand, local address, phone, hours, Instagram, and booking CTA.

### Home

- First viewport must show the brand, a real haircut photo, clear local positioning, and a primary booking CTA.
- Above-the-fold copy must answer: what Sulmina is, where it is, what services it offers, and how to book.
- Include a compact service/price proof strip with real services and prices.
- Downstream sections: services menu, craft/story, gallery proof, reviews fallback, booking CTA, contact/location strip.
- Keep the next section visible or hinted after the first viewport on common laptop sizes.

### Services

- Services grouped by the existing categories from `src/data/services.js`.
- Each service row shows name, duration, price, description, and booking link.
- Rows must be readable and tappable on mobile without price/name collision.
- Include SEO copy for "barber shop in Southgate", "skin fade Southgate", "beard trim Southgate", and "men's haircuts Southgate" naturally.

### About

- Explain the shop in plain, local terms: 43 High Street, Southgate, online bookings, open seven days.
- Use real shop/haircut photography and tactile story layout.
- Avoid invented awards, fake team names, or claims not present in the data.

### Gallery

- Use the existing `public/images/gallery` loader.
- Gallery grid must use stable aspect ratios, no layout shift, no image clipping that hides the haircut subject.
- First few images can eager-load only when above the fold; rest lazy-load.

### Contact

- Address, phone, opening hours, map, Instagram, and booking CTA.
- Map must not overflow or become unusable on mobile.
- Include local search phrasing: "Sulmina Barber Shop, 43 High Street, Southgate N14 6LD".

### Booking Flow

Keep the existing four-step route model:
1. `/book` service selection.
2. `/book/barber` barber selection.
3. `/book/time` date/time selection.
4. `/book/details` customer details and confirmation.

Functional rules:
- Preserve existing service slugs and prices.
- Preserve existing availability engine and transaction-backed booking insert.
- Preserve "Any available" behavior.
- Preserve no-payment booking.
- Preserve conflict handling and confirmation pages.
- Do not add a client-side framework or build step.

UX rules:
- Mobile first.
- All primary tap targets 44px minimum.
- No booking controls hidden under fixed header.
- No 7-column date grid cramped at 320px; switch to scrollable date rail or compact week controls.
- Time slots must be readable, with selected/free/busy states clear.
- Sticky summary/CTA must not cover form fields or final slot rows.
- Validation errors must have enough space and explain the fix.
- Back/change actions must be visible at each step.

## SEO, GEO, And AEO Requirements

Use search guidance from Google Search Central:
- Keep pages crawlable as server-rendered HTML.
- Use unique titles and meta descriptions per page.
- Use canonical URLs and noindex only on booking query/detail pages.
- Keep helpful local content visible in HTML, not only image text.
- Add structured data for `HairSalon`/`LocalBusiness` with name, URL, phone, address, geo coordinates, opening hours, image, logo, sameAs, and price range.
- Add service-oriented structured data where practical without misrepresenting offers.
- Add FAQ-style content only if it answers real booking/location/service questions.
- Improve Open Graph/Twitter metadata.
- Keep sitemap and robots routes accurate.
- Use natural local keywords, not stuffing.
- Use descriptive alt text for real photos.

Local keyword themes:
- Sulmina Barber Shop.
- Barber shop in Southgate.
- Southgate barber.
- Skin fade Southgate.
- Beard trim Southgate.
- Men's haircuts Southgate.
- Barbers near Southgate station.
- 43 High Street Southgate N14.

## Render Constraints

- Keep `npm start` as `node server.js`.
- Respect `PORT`.
- Keep environment variables dashboard-friendly: `MONGODB_URI`, `SITE_URL`, SMTP variables.
- Do not require a build step unless a `render.yaml` is deliberately added later.

## Verification Requirements

Before completion:
- Run `node _test\availability.test.js`.
- Smoke render all primary routes.
- Start local app with a usable Mongo strategy or a mocked smoke strategy if production Mongo secrets are unavailable.
- Browser QA desktop and mobile for home, services, contact, and the full booking path through details validation.
- Verify no horizontal overflow at 320px, 390px, 768px, and desktop.
- Verify no console errors relevant to app behavior.
- Verify SEO HTML: titles, descriptions, canonical, robots, JSON-LD, sitemap, and robots.txt.
- Compare rendered screenshots against the approved A/C target and record any intentional deviations.

