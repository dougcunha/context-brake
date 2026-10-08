# Context snapshot — prd-16-configuracao-guiada-assistente-no-init

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-08
- stage: acceptance
- stage_source: tasks.md (T01..T06 all in done/)
- covers_through: HIL 3 accepted; feature completed
- authored_code: yes
- git_head: b216aba
- worktree: uncommitted prd-16 work (src/cli init/assistant/terminal files, src/core auto-restart-merge and installation-builder, tests, README, docs/research) plus tasks/prd-16-* edits; foreign untracked .agents/skills/chat-clean/ and tasks/prd-11-reinicio-automatico-no-claude-code/rtk/
- next_step: —
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

- Why next: DAG complete (T01..T06 done with handoffs); the global review must run in a context that did not write the code.
- Read first: checkpoint.json, tasks.md (State), then the sources the review skill names; judge the diff against `--base b216aba` (uncommitted worktree).
- Known change points: src/cli/commands/init.ts, src/cli/assistant/*, src/cli/terminal.ts, src/cli/init-arguments.ts, src/cli/init-option-rules.ts, src/cli/init-config-updates.ts, src/core/services/auto-restart-merge.ts and installation-builder.ts, README.md, docs/research/terminal-tty.md.
- Applicable entries: O-01, O-02, L-06, L-07.
- Watch out: FR-10 measurement (TC-15, OBJ-05) was deferred by the person at HIL 2 (DEC-HIL-02); it is an accepted limitation, not a defect.

## Decisions

- [D-01] (when: now) Design: the assistant only produces an `init` flag list; `init` re-parses it with the same `parseInit`, and the same list is the printed equivalent command, so equivalence holds by construction — src: techspec.md#solution-summary; until: feature closed
- [D-03] (when: now) DEC-HIL-02 (prd-16): restart question skipped when no selected harness has a restart mode; the real-terminal TTY probe (FR-10 measurement, TC-15, OBJ-05) is deferred and recorded as not measured; follow the 180 s budget rule — src: workflow.md#human-decisions-log; until: feature closed

## Learnings

- [L-01] (when: on-run: npm test) Single-file runs use `npm test -- <path>`; ESLint enforces max-lines-per-function 30 (a `describe` callback counts as one function), max-lines 100 code lines, and function declarations at module level — src: package.json; until: feature closed
- [L-06] (when: on-edit: README.md; tasks/prd-16-*/**) The working tree is CRLF almost everywhere, but README.md must stay LF (tests match `\n` after the json fence); Python text-mode writes on Windows convert LF to CRLF, so edit with the Edit tool or sed, never `open(..., 'w')` — src: done/task_06.md#handoff; until: feature closed
- [L-07] (when: on-run: npm run coverage; npm run test:budget) Suite wall time swings 104 to 222 s with machine load; the last green gates measured 120.6 s (budget) and 121.4 s (coverage), 94.58 % lines, 1377 tests; a lone `beforeEach` 10 s timeout in doctor-exclusion under load passed alone — src: done/task_06.md#handoff; until: feature closed

## Open threads

- [O-01] (when: now) FR-10 real-terminal measurement deferred by the person (DEC-HIL-02): `docs/research/terminal-tty.md` rows are "not measured"; list OBJ-05 as an open limitation at acceptance — src: techspec.md#risks-and-open-items; until: feature closed
- [O-02] (when: now) For HIL 3: `init --interactive` with typed configuration flags drops them (only `--dry-run` is kept; the assistant shows the stored state); a printed command with no flags (`context-brake init`) restarts the assistant on a terminal; one QA-06 reservation hit in `tests/helpers/assistant-world.ts` — src: done/task_05.md#handoff; until: feature closed
- [O-03] (when: now) codereview_01 was REJECTED for CR-01 only (leading-dash values; fixed by `valueFlag` in questions-snapshot.ts, correction task in codereview_01/done/task_01.md). CR-02 (default harness preselection excludes a harness detected after the first install; DEC-03 specifies it) and CR-03 (see O-02) are design points for HIL 3; CR-04: tasks.md hash in the checkpoint is refreshed at closing and TC-01/TC-03 tests live in init-max-restarts-arguments.test.ts — src: codereview_01/codereview.md#findings; until: feature closed
- [O-04] (when: now) qa_01 APPROVED (TC-14 on the built CLI; TC-15/FR-10/OBJ-05 NOT VERIFIABLE by decision). OBS-01: default Git Bash rewrites a slash-leading value passed to node (`--snapshot-command /sdd-snapshot`); `MSYS_NO_PATHCONV=1` avoids it; already documented in the README for typed flags — src: qa_01/qa.md; until: feature closed
