# Context snapshot — prd-13-refatoracao-modo-leve-testes-rapidos

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-07
- stage: acceptance
- stage_source: tasks.md
- covers_through: codereview_03 round 3 T12 done (DEC-RES-01)
- authored_code: yes
- git_head: cca3a29
- worktree: uncommitted prd-13 diff (vitest configs, tests/, scripts/test-budget*, src/cli/{main,commands/init,commands/doctor}.ts, package.json, AGENTS.md, .agents/rules/tests.md) plus prd-13 artifacts; untracked prd-11 rtk/
- next_step: — (feature completed at HIL 3, DEC-HIL-03; next slice prd-14)
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

- Why next: codereview_01 is REJECTED with two Low findings. CR-01: `scripts/check-test-budget.ts` ignores Vitest's exit code (in contract, fix automatically). CR-02: the process list holds 12 files against the 10 in TechSpec DEC-04, and two capability unit tests start processes; this needs a decision. The DEC-06 deviation (no per-project fork cap in Vitest 3.2.7) and the DEC-03 deviation (plugin round trips in `runtime-in-process`) also need HIL acknowledgement.
- First: answer the exception HIL in `checkpoint.json#pending_hil`, then `sdd-plan-corrections --report codereview_01`.

## Decisions

- [D-01] (when: on-select: T01; T03; T04; T05; T07) Baseline at cca3a29: `npx vitest run` took 324 s wall, 1,052 tests in 197 files (e2e 188 s, integration 200 s, unit 19 s of file time). A built `doctor` takes 4.9 s (20 process samples per harness); `--help` takes 0.4 s; 12 CPUs, `MAX_WORKERS = 2` — src: techspec.md#Sources and traceability; until: prd-13 completed
- [D-02] (when: on-run: npx vitest; npm test) DEC-PROC-01/02 from prd-12 apply: each task runs only its touched suites; T07 runs the full suite because measuring it is the deliverable — src: ../prd-12-refatoracao-modo-leve-modo-unico/workflow.md#Human Decisions Log; until: prd-13 completed

## Learnings

- [L-01] (when: on-run: npm run coverage; npm test) The full suite takes about 5-6 min until T05; run it in the background and parse `--reporter=json` with a script file (scratchpad `timing.py` pattern) instead of inline Python — src: —; until: T07 done
- [L-04] (when: on-run: vitest; on-edit: tests/**) On Windows, writing a test file while vitest runs fails with `UNKNOWN: unknown error, open`; wait for the run to finish — src: —; until: prd-13 completed
- [L-05] (when: on-edit: tests/**; src/**; *.md) Bash heredocs turn an escaped newline into a real one, and long heredocs can fail with "unexpected EOF"; write edit or generator scripts with the Write tool into the scratchpad and run them with `python -I` — src: —; until: prd-13 completed
- [L-08] (when: on-run: npm run lint) Through the rtk hook, `npm run lint | tail` can print nothing while eslint fails; run `rtk proxy npx eslint .` and treat empty output as clean — src: —; until: prd-13 completed
- [L-11] (when: on-run: rg) Through the rtk hook, `rg -l` over several directories can print paths without separators; use `grep -l` with explicit globs for file lists — src: —; until: prd-13 completed
- [L-12] (when: on-edit: tests/unit/*.test.ts) The 100-line limit and `max-lines-per-function` 30 apply to test files; split a growing test file instead of extending it — src: ../prd-12-refatoracao-modo-leve-modo-unico/codereview_03/done/task_12.md#Handoff; until: prd-13 completed

## Code map

- [M-01] (when: on-select: T02; T03; T04) In-process CLI already exists: `tests/helpers/delegated-world.ts:runCli` calls `dispatchCommand` with stdout and stderr spies — src: techspec.md#Technical decisions; until: prd-13 completed
- [M-02] (when: on-select: T04; T05) In-process hook host: `src/infrastructure/runtime/process-hook-host.ts:runProcessHook(adapter, context)` with an injectable `ProcessHookContext` (argv, readStdin, writeStdout, writeStderr) — src: techspec.md#Test approach; until: prd-13 completed
- [M-03] (when: on-select: T05; on-edit: tests/test-lanes.ts) `tests/unit/test-lanes.test.ts:36` forces every file with a `PROCESS_MARKERS` hit into the process or serial lane; DEC-05 drops `/cli/commands/` and `composition-root` — src: techspec.md#Technical decisions; until: T05 done

## Open threads

- [O-04] (when: now; on-run: npm run test:budget) Budget runs vary with machine load (77-158 s this session; two over 120 s while other Claude Code sessions used CPU); one failure under load is unidentified, and the budget output now names failed tests — src: done/task_07.md#Handoff; until: prd-13 completed
- [O-02] (when: now) prd-13 artifacts are uncommitted; commit only on request — src: workflow.md#Feature Summary; until: committed
- [O-03] (when: now) ContextBrake measured telemetry read `usage=58% tokens=587194/1000000 source=measured window=harness` (turn 132, 2026-10-07) while the user saw 35% in Claude Code; the measured reading may overcount (cache or subagent transcripts?). Investigate outside prd-13, on request — src: —; until: investigated
