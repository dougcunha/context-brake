# Context snapshot — 21-manual-handoff-command

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-21
- stage: acceptance
- stage_source: qa_03/
- covers_through: qa_03; HIL 3 live checks MA-01, MA-04 (H-07); MA-02 passed (H-08); MA-03 typed in abf64f4b
- authored_code: no
- git_head: c17fd0a
- worktree: 24 changed: .gitignore, README.md, docs/, src/, tests/, tasks/prd-21-manual-handoff-command/
- next_step: — (feature completed, H-11)
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

- Why next: MA-01, MA-02, MA-04 passed (H-07, H-08). The user typed `/handoff` during an agent turn in session `abf64f4b` (MA-03). Agent evidence: in `abf64f4b`, the `/handoff` accepted line and prompt came after the `npm run typecheck` turn ended (typecheck passed, 0 errors); the user must confirm that `/handoff` was typed while that turn ran. This session should be the one that restart opened.
- Read first: `workflow.md#H-08`; `checkpoint.json` `pending_hil`; `techspec.md#test-approach` (MA-03, MA-05).
- Known change points: none. Check `.context-brake/runtime/restart/claude-code/abf64f4b-2ef9-4665-b8d6-1e6c6c1be6df.json` for `RESTARTED` and the `abf64f4b` transcript for the order of the turn end and the `/handoff` prompt. Ask the user for the MA-03 result. MA-05: the user removes the `autoRestart` block from `context-brake.config.json` (the mod stays installed), types `/handoff`, and expects the off line that names `npx context-brake init --auto-restart` and no turn; then restores the block with `maxConsecutiveRestarts: 10`.
- Applicable entries: O-01, O-02, L-04, L-01.
- Watch out: a live failure becomes a correction round from a new QA report (`qa_04`), then a new review and QA. `init --no-auto-restart` removes the mod, so do not use it for MA-05.

## Decisions

- [D-01] (when: on-select: FR-13; release) `MOD_VERSION` stays equal to `package.json` (1.2.0); FR-13 is met at the next release bump — src: workflow.md#A-02; until: release bump

## Learnings

- [L-04] (when: on-edit: src/infrastructure/harnesses/claude-code/mod/**; on-run: claude plugin test) The host refuses `$.prompt.submit` from a `command.run` hook; submit from a `$.clock.after` timer. `claude plugin test` enforces host checks (timers need `mock.clock` + `advance`); the in-process fake models only this one — src: qa_02/qa.md#findings; until: feature closed
- [L-01] (when: on-run: npm run coverage; vitest) Mod scene tests that read the restart log after an async write must use `waitForCodes` or `expect.poll`; a 20 ms `flush` is not enough under full-suite load — src: —; until: next session
- [L-02] (when: on-run: python; on-edit: tasks/**) Python `open(..., 'w')` on Windows writes CRLF; edit files with node `fs` or the Edit tool — src: —; until: next session
- [L-03] (when: on-run: claude plugin validate) Validate the plugin folder `.context-brake/claude-mod/context-brake-restart`; the parent folder checks only the marketplace manifest. `command.run{command=?}` is expected (constant name) — src: qa_01/qa.md#end-to-end-runs; until: next session

## Code map

- [M-01] (when: on-edit: src/infrastructure/harnesses/claude-code/mod/**) Command: `handoff-command.ts`; seed wait: `session-switch.ts`, `restart-host.ts:clearAndSeed`; host fake: `tests/fixtures/claude-mod-host-ports.ts` — src: —; until: changed files overlap

## Open threads

- [O-01] (when: now) MA-01, MA-02, MA-04 passed (H-07, H-08). Ask the user for MA-03 (`/handoff` typed during a turn in `abf64f4b`), then MA-05 (`autoRestart` off). All pass → HIL 3 acceptance; a failure → `qa_04` and a correction round — src: workflow.md#H-08; until: HIL 3 answered
- [O-02] (when: now) Accepted open items for the final summary: FR-13 (release bump), AUTO-06 and AUTO-08 optional improvements, `.gitignore` diff from a repository `init` run (keep out of the feature commit), P-04/P-05, Linux and macOS not run — src: autonomous-decisions.md#AUTO-06; until: feature closed
