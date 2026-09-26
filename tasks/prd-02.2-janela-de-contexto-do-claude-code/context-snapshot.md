# Context snapshot — 02.2-janela-de-contexto-do-claude-code

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: active
- generated: 2026-09-26
- stage: corrections
- stage_source: codereview_01/
- covers_through: codereview_01/task_12.md (planned; none executed)
- authored_code: no
- git_head: 5917593
- worktree: 84+ changed, uncommitted: README.md, assets/, docs/, schemas/, scripts/, src/, tests/, tasks/
- next_step: sdd-execute-corrections — codereview_01 T06 (after the exception HIL answer)
- other_eligible: T08, T09, T11 (no dependencies)
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

- Why next: codereview_01 is REJECTED; correction round 1 is planned as T06–T12 in `codereview_01/` (DAG: T06→T07; T09→T10; T08, T11 free; T12 last, after T07, T08, T10, T11).
- Do: record the exception HIL answer in `workflow.md`, then run `sdd-execute-corrections` one task at a time, session pause after each.
- Read first: `workflow.md#human-decisions-log`, the task file, and `codereview_01/codereview.md#findings` for its CR.
- Applicable entries: O-04, L-02, L-03, L-04.
- Nothing is committed; commits only when the user asks. The re-review (codereview_02) must run in a session that made no corrections.

## Decisions

- [D-04] (when: on-select: T06; DEC-07; DEC-09) Approved deviations (owner `harness_entry`; `AdapterPlan.findings`) now live in `workflow.md` DEC-HIL-03; T06 writes them into the TechSpec. — src: workflow.md#human-decisions-log; until: T06 done

## Learnings

- [L-02] (when: on-run: npm run coverage; npm test) Run `npm run build` first after touching `src/` (asset-currency tests compare bundles). The full suite takes about 14 minutes here; add `-- --coverage.reportOnFailure` so a timing flake still yields the coverage figure. — src: tasks.md#problems-and-solutions; until: feature closed
- [L-03] (when: on-run: on failure: Test timed out) Load-sensitive tests seen timing out in full runs, all green alone: `init-legacy-turn-limits`, `e2e-support-limitations`, `node-process-runner`. — src: tasks.md#problems-and-solutions; until: feature closed
- [L-04] (when: on-edit: tests/**/*.test.ts) Tests calling Claude `planInstall` with their own snapshot list must include `.claude/hooks/context-brake-statusline.mjs`; install/doctor tests must isolate the user scope with a temp `userHome` (in process) or `HOME`/`USERPROFILE` (built CLI). — src: tests/helpers/statusline-world.ts; until: feature closed
- [L-05] (when: on-select: T12) CI triggers only on push to `master`/`main` or a PR against them, so CR-04 evidence needs a pushed branch plus PR. — src: .github/workflows/ci.yml; until: T12 done

## Code map

- [M-01] (when: on-select: T08; T09; T10; T11; src/infrastructure/harnesses/claude-code/statusline-*) Bridge runtime `statusline-bridge.ts` + `statusline-payload.ts`; install `statusline-planner.ts`, restore `statusline-restore.ts`, shared reading and command building `statusline-settings.ts`, state `statusline-state.ts`; doctor `statusline-diagnostics.ts` + `statusline-context-window.ts`. — src: done/task_03.md#handoff; until: feature closed
- [M-02] (when: on-select: T07; CR-01) Estimated window: `usage-resolver.ts:26` returns `contextWindowCeiling`; `session-zone.ts:mergeMeasurements` builds `{tokens, contextWindow}`; in-process harnesses pass `contextWindow` with possibly null `tokens` (`common/in-process-support.ts:measuredUsageFrom`). — src: codereview_01/codereview.md#findings; until: T07 done

## Open threads

- [O-04] (when: now; T06; T07; T12) Exception HIL pending: CR-01 option A or B for DEC-06, push authorization for CR-04 (T12), and whether OI-01/OI-02 join the round. — src: checkpoint.json#pending_hil; until: answer recorded in workflow.md
