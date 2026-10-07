# Context snapshot — prd-12-refatoracao-modo-leve-modo-unico

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-07
- stage: acceptance
- stage_source: codereview_04/
- covers_through: codereview_04 APPROVED WITH RESERVATIONS (only OI-02, accepted by DEC-HIL-RES-01)
- authored_code: yes
- git_head: 1474f54
- worktree: uncommitted T01-T07 diff (src, tests, schemas, scripts, docs, README, rules, skills, package.json, vitest.config.ts, eslint.config.js, repo config and .claude/settings.json) plus tasks/prd-12..14 artifacts and tasks/triage-log.jsonl
- next_step: — (feature completed at HIL 3, DEC-HIL-03; next slice prd-13)
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

- Why next: the review cycle is closed. codereview_04 is APPROVED WITH RESERVATIONS, and its only reservation is OI-02, accepted for prd-14 (DEC-HIL-RES-01). DEC-HIL-02 set no CLI QA run, so the next step is HIL 3.
- First: answer HIL 3 in `checkpoint.json#pending_hil`. The material is `codereview_04/codereview.md#Limitations and open items` and `done/task_07.md#Handoff` (MA-01, O-07). Accepting also re-hashes `tasks.md` (drift from status, links, and the T13 row).
- After acceptance: mark the checkpoint `completed` and this snapshot `closed`. prd-13 is the next slice (D-01). Commit only on request (O-02).

## Decisions

- [D-01] (when: on-select: prd-13; prd-14) Slice order prd-12 → prd-13 → prd-14; shared product decisions live in this folder's workflow.md (DEC-PD-01..08) — src: workflow.md#Human Decisions Log; until: prd-14 completed
- [D-02] (when: on-run: npm run coverage) DEC-PROC-01: the one full `npm run coverage` ran after T07 (1,049 tests, 342.9 s); later steps run touched suites only — src: workflow.md#Human Decisions Log; until: prd-12 completed
- [D-03] (when: on-run: vitest) DEC-PROC-02: never start a full `npx vitest run` mid-task; list failures owned by later tasks in the handoff instead — src: workflow.md#Human Decisions Log; until: prd-12 completed

## Learnings

- [L-01] (when: on-run: npm run coverage) Full coverage takes 6-10 min until prd-13; run it in the background and read the log with `sed 's/\x1b\[[0-9;]*m//g' | grep -E "^ FAIL|Test Files|Tests |All files"` — src: —; until: prd-13 completed
- [L-04] (when: on-run: vitest; on-edit: tests/**) On Windows, writing a test file while vitest runs fails with `UNKNOWN: unknown error, open`; wait for the run to finish — src: —; until: prd-12 completed
- [L-05] (when: on-edit: tests/**; src/**; *.md) Bash heredocs here turn `\\n` into a real newline even when quoted; write edit scripts with the Write tool into the scratchpad and run them with python, asserting each replaced string exists — src: —; until: prd-12 completed
- [L-06] (when: on-edit: tests/integration/init-*) `init` with `--json` prints argument errors on stdout, not stderr; assert on `stdout + stderr` — src: —; until: prd-12 completed
- [L-08] (when: on-run: npm run lint) Through the rtk hook, `npm run lint | tail` can print nothing while eslint fails; run `rtk proxy npx eslint .` and treat empty output as clean — src: —; until: prd-12 completed
- [L-09] (when: on-edit: src/infrastructure/storage/directory-pruner.ts; on-select: prd-14) `remove` leaves the empty `.context-brake/claude-mod/**` directory tree (mod files are not prunable owners); since T06 `.context-brake/` is kept silently when not empty, so this no longer warns — src: done/task_06.md#Handoff; until: prd-14 completed
- [L-10] (when: on-select: prd-14) On Claude Code 2.1.292 the settings `SessionStart` hook fires after a mod `/clear` (`SessionStart:clear`), so the resume text need not move into the mod seed for Claude Code — src: done/task_07.md#Handoff; until: prd-14 completed

## Code map

## Open threads

- [O-02] (when: now) tasks/triage-log.jsonl, all prd-12/13/14 artifacts, and the T01-T07 code are uncommitted; commit only on request — src: workflow.md#Feature Summary; until: committed
- [O-07] (when: now; on-select: prd-14) The first MA-01 (d) attempt (11:54:56Z, session e02e2b55) ran no `/clear` and left no mod record; the rerun passed with the same build and config, so the cause is unknown — src: done/task_07.md#Handoff; until: prd-12 HIL 3
