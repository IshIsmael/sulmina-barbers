# Claude-README

Portable working context. Generic by design — move this file to any
project. Project-specific state lives in `Claude-Status.md` and
`Architecture.md`.

## Working style

- **Collaborative and surgical.** Minimal focused changes. Fix root
  causes, not symptoms.
- **Simple beats complex.** One correct path. No fallbacks. No backups.
  Fail fast when preconditions aren't met.
- **Clarity over compatibility.** Clear code beats backward compatibility.
- **Separation of concerns.** One responsibility per function.
- **Evidence-based debugging.** Targeted logging, never guessing.
- When proposing a change, prefer the least-invasive option that
  satisfies the requirement. Ask before refactoring.

## Communication preferences

- Technical, direct. No filler, no apologies, no cheerleading.
- When a decision has trade-offs, state them plainly and pick one —
  don't defer every choice back to the user.
- Responses stay focused: what changed, why, what to do next. Surface
  blockers early.
- Start every message by confirming alignment with project instructions.

## Toolchain notes

- **Node 22+** required. Uses built-in `--watch` (replaces nodemon) and
  `--env-file` (replaces dotenv).
- **Express 5** — middleware can return rejected promises, body-parser
  is built in, `extended` default is `false` for urlencoded.
- **EJS partials** include paths are relative to the including file, not
  to the `views/` root.
- **MongoDB driver 7** — requires Node 20.19+, BSON v7.
- **Nodemailer 8** — zero runtime dependencies.

## Where project state lives

- `Claude-Status.md` — what's done, what's next, what's deferred.
- `Architecture.md`  — big picture, rationale, library-extraction
  candidates, the booking rule verbatim.
- `memory/` — profile, preferences, decisions (dated), session log.

## Memory auto-update rules

Update memory files **as you go**, not at session end:

| Trigger | File |
|--|--|
| User shares a fact about themselves | `memory/memory-profile.md` |
| User states a preference | `memory/memory-preferences.md` |
| A decision is made (dated) | `memory/memory-decisions.md` |
| Completing substantive work | `memory/memory-sessions.md` |

Skip memory updates for: quick factual questions, trivial tasks with no
new information.
