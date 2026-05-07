# Sulmina Barbers — Booking Website

Mobile-first Node.js + Express + EJS site backed by MongoDB Atlas, for
Sulmina Barber Shop (43 High St, London N14 6LD).

## Run locally

```bash
# 1. Copy env template and fill in your MONGODB_URI
cp .env.example .env            # macOS / Linux
copy .env.example .env          # Windows PowerShell

# 2. Install dependencies
npm install

# 3. Start in dev mode (auto-restart on file changes)
npm run dev
# → http://localhost:3000
```

Node 22 or newer is required. Verify with `node -v`.

## Scripts

| Command | What it does |
|--|--|
| `npm run dev` | `node --env-file=.env --watch server.js` — loads env vars, restarts on file changes |
| `npm start`   | `node server.js` — production-style start, env vars must be set in the environment |

## Project layout

```
server.js                 Express entry point, Mongo connect, listen
src/
  config/shop.js          Barber count, opening hours, shop info (the knobs)
  data/services.js        Single source of truth for services + prices
  lib/mongo.js            Mongo connection wrapper (one connection per process)
  lib/email.js            Nodemailer wrapper — throws if SMTP missing (Phase 3)
  routes/pages.js         Page routes (home only in Phase 1)
views/                    EJS templates + partials
public/                   Static assets (css, img)
memory/                   Claude's working memory files
```

## Claude context files

- `Claude-README.md` — portable working principles
- `Claude-Status.md`  — project snapshot, next task, deferred items
- `Architecture.md`  — big-picture design, booking rule, extraction candidates
