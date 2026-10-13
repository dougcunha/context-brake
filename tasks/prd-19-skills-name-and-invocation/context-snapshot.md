# Context snapshot — 19-skills-name-and-invocation

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-13
- stage: review
- stage_source: tasks.md
- covers_through: T05
- authored_code: yes
- git_head: 7295a43
- worktree: 83 changed (uncommitted): src, tests, schemas, docs, README.md, AGENTS.md, context-brake.config.json, .agents/skills, tasks
- next_step: sdd-review-code — global review of 19-skills-name-and-invocation, `--base 7295a43`, by a context that did not write the code
- other_eligible: —
- superseded_by: —

## Load map

| Tier | Load when |
| --- | --- |
| `now` | Session start: header, next step brief, open threads waiting on the user |
| `on-select` | Chosen unit matches a trigger: task or finding ID, affected file, or traceability ID |
| `on-edit` | About to edit or create a path matching a trigger |
| `on-run` | About to run a matching command, or it just failed |
| `on-demand` | A gist is not enough: follow its `src:` pointer, that section only |

Review and QA sessions load only the header, next step brief, `Open threads`, and `on-run` entries.

Entry shape: `- [ID] (when: tier: trigger; trigger) gist — src: path#section; until: condition`

## Next step brief

- Why next: T01 to T05 are in `done/` with green gates (258 files, 1340 tests, `schemas:check`, `test:budget` 101 s, `package:smoke`). This session wrote the code, so the review needs a new context.
- Read first: `checkpoint.json`, `tasks.md`, the PRD requirement tables, the TechSpec "Quality profile" and "Terrain baseline", then `done/task_*.md` handoffs. The diff is the uncommitted worktree against `7295a43`.
- Known change points: `src/core/contracts/skill-name.ts`, `src/core/services/zone-guidance.ts`, `src/core/services/skill-invocation.ts`, `src/infrastructure/harnesses/skill-invocations.ts`, `src/infrastructure/harnesses/*/skill-invocation.ts`, `src/cli/assistant/invocation-facts.ts`, `src/core/services/doctor-report-extras.ts`.
- Applicable entries: D-01, D-02, L-01, O-01, O-02.
- Watch out: do not run `context-brake init --yes` in this repository; the installed hook assets are the running session's (O-02).

## Decisions

- [D-01] (when: now) The review runs in a context that did not author the code: an eligible delegated reviewer if the host allows one, else the resumed session runs `sdd-review-code` itself. Mode is `auto`: route the literal status without asking — src: `.agents/skills/sdd-review-code/references/delegated-review.md`; until: review recorded
- [D-02] (when: on-select: review) Departures from the first draft are logged: AUTO-03 keeps the keys `command`/`resumeCommand`; AUTO-04/05 use the plain sentence for OpenCode, Oh-My-Pi, Antigravity; AUTO-08 prints doctor forms as words; AUTO-09 shows the per-harness preview in the summary card, not a prompt note — src: autonomous-decisions.md; until: review recorded

## Learnings

- [L-01] (when: on-run: npm run coverage; npx vitest run) Tests that drive the built CLI or the installed hook (`light-mode-lifecycle`, `tests/e2e/*`) need `npm run build` first or they see stale `dist/` — src: —; until: next session
- [L-02] (when: on-edit: tests/**) A wrapped `describe` callback must stay under 30 lines (`max-lines-per-function`); split into a second `describe` — src: —; until: next session

## Code map

- [M-01] (when: on-edit: src/infrastructure/harnesses/**) Each harness folder holds `skill-invocation.ts`; `runtime.ts` descriptors take it; `skill-invocations.ts` is the exhaustive `Record<HarnessId, …>` resolver — src: —; until: changed files overlap

## Open threads

- [O-01] (when: now) Slice `20-skills-wizard-discovery` has its PRD and a `paused` checkpoint with blocker B-01 (waits for 19 accepted); it still needs TechSpec and tasks — src: ../prd-20-skills-wizard-discovery/checkpoint.json; until: 19 accepted
- [O-02] (when: now) `doctor` reports ASSET_OUTDATED for `.claude/hooks/context-brake.mjs` and the mod `register.mjs`; refreshing them is `context-brake init --yes`, left to the user (AUTO-10). Until then the installed hook renders the bare name without a slash — src: done/task_05.md#Handoff; until: user runs init
