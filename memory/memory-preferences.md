# memory-preferences.md

Stated preferences. Update **immediately** when new ones are expressed.

## Design principles (user-stated)

- Don't overengineer — simple beats complex.
- No fallbacks — one correct path, no alternatives.
- One way to do things, not many.
- Clarity over compatibility.
- Throw errors — fail fast when preconditions aren't met.
- No backups — trust the primary mechanism.
- Separation of concerns — one responsibility per function.

## Development methodology (user-stated)

- Surgical changes only — minimal, focused fixes.
- Evidence-based debugging — targeted logging, not guessing.
- Fix root causes, not symptoms.
- Prefer static / framework-level checks over runtime checks.
- Collaborative — work with the user on the most efficient solution.
- Manageable steps — present workable amounts of work per turn.

## Communication preferences

- Confirm project-instruction alignment at the start of every message.
- Direct, technical tone. No filler or cheerleading.
- When a decision has trade-offs, state them and pick one.

## Stack preferences (this project)

- Node.js (user is on v24.15.0) + Express 5 + EJS + MongoDB Atlas.
- Mobile-first UI.
- Target audience 12–40 year olds; premium, modern, not block-by-block.
- Plain CSS, no framework.
- Latest stable versions of all deps.

## Documentation conventions

- `Claude-README.md` — portable / generic across projects.
- `Claude-Status.md`  — current snapshot, refreshed at session end.
- `Architecture.md`   — big-picture rationale, separate from debug
  context.
- `memory/` — profile, preferences, decisions (dated), session log.
