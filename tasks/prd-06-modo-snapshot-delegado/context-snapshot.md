# Context snapshot — prd-06-modo-snapshot-delegado

> These are hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: closed
- generated: 2026-09-25
- stage: acceptance
- stage_source: codereview_2/
- covers_through: codereview_2/codereview.md (APPROVED)
- authored_code: no
- git_head: 3b94a9c
- worktree: 57 changed: src/, schemas/, docs/research/, tests/, README.md, tasks/prd-06-modo-snapshot-delegado/ (all uncommitted)
- next_step: — (feature completed, DEC-HIL-03)
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

- Why next: review 2 (`codereview_2/codereview.md`) is APPROVED and CR-01 is resolved. CLI QA was skipped by `DEC-HIL-02`, so HIL 3 acceptance comes next.
- Read first: `codereview_2/codereview.md` (Summary, Limitations), `workflow.md#Milestone History`.
- Present at HIL 3: the non-blocking limitations (PRD-03/04 load flakes, O-01 manual `Skill` capture, the `doctor --json` NFR-01 exception, and Linux/macOS through CI).
- Applicable entries: O-01, O-03.

## Decisions

- [D-01] (when: on-select: T02; T03; T04; DEC-02) The mode is automatic (HIL 1 PD-01): delegated when the section exists and the plan file is missing. An invalid but present plan stays in plan mode. — src: workflow.md#Human Decisions Log; until: feature closed
- [D-02] (when: on-select: T05; qa) CLI QA is skipped at acceptance (HIL 2). Acceptance rests on the review plus e2e TC-14. — src: workflow.md#Human Decisions Log; until: feature closed

- [D-03] (when: on-select: T03; T04; DEC-11) The engine and failure-policy option is `planPresence: PlanPresence` (in `src/core/contracts/checkpoint-mode.ts`); the guidance comes from `resolveGuidance` in `zone-guidance.ts`. `doctor` (T04) can reuse `resolveCheckpointMode`. — src: done/task_02.md#Handoff; until: feature closed

## Learnings

- [L-02] (when: on-select: T04) `checkStateFiles` already skips missing plan and checkpoint files, so `doctor` raises no warning when the plan is absent. FR-11 needs only the new findings. — src: src/core/services/doctor-checks.ts:60; until: doctor-checks.ts changed

- [L-03] (when: on-edit: tests/**) ESLint applies `max-lines` 100 and `max-lines-per-function` 30 to tests as well. Put new cases in new files instead of growing large suites. — src: tasks.md#Problems and solutions; until: feature closed
- [L-04] (when: on-run: npm run coverage; on failure: e2e-run-stops; on failure: boot-git-delivery) Process-lane tests can flake under full-suite load. Rerun the file alone, then do one more full run. Rebuild `dist/` first when `src/` changed, because e2e uses the built CLI. — src: codereview_2/codereview.md#Executed validations; until: feature closed

## Code map

- [M-01] (when: on-edit: src/core/contracts/configuration.ts) Reuse `relativePath`, `canonicalPathPattern`, `uniqueCheck`, `additionalAllowedCommand` (trim and line rules) for the new schema. — src: —; until: configuration.ts changed
- [M-02] (when: on-edit: src/core/services/brake-engine.ts; src/core/services/failure-policy.ts) The mode-dependent strings are `ZONE_ACTIONS` (`zone-actions.ts`), `renderBlockMessage` and `renderFailureBlockMessage` (`block-message.ts`), and `touchesOnlyStateFiles` (`brake-allowlist.ts`). `handlePostTool` and `handlePreInvocation` call `decideInjection` before rendering, which is the lazy point for `readGuidance`. — src: —; until: those files changed
- [M-03] (when: on-edit: src/infrastructure/runtime/**; src/infrastructure/runner/wrap-telemetry.ts) `createRuntimePorts` builds `readValidationCommand` and `readBoot`; add `readGuidance` beside them. `wrap-telemetry.ts` calls `renderSessionTelemetry` (in `session-zone.ts`). — src: —; until: runtime-composition.ts changed
- [M-04] (when: on-edit: src/infrastructure/harnesses/claude-code/runtime.ts) The tool mapping sits at lines 19–26. Anything that is not `Bash`, `Read`, or a write tool becomes `other`. — src: —; until: file changed
- [M-05] (when: on-select: T04) `planConfigChange` (`installation-builder.ts:14`) rebuilds the config from `curr` plus `activeHarnesses`. `planProtocolChange` compares the full rendered text. `RUN_PLAN_NOT_RUNNABLE` is thrown in `src/cli/commands/run-preflight.ts:32`. — src: —; until: files changed

## Open threads

- [O-01] (when: on-select: T05; review; acceptance) The `Skill` `tool_input.skill` field is observed, not documented. Capturing a real payload is an open manual verification. — src: done/task_03.md#Handoff; until: feature closed
- [O-03] (when: now: acceptance; on-run: npm run coverage) Load-only flakes outside prd-06: `e2e-run-stops` (PRD-04) and `boot-git-delivery` (PRD-03, git inspection times out to `inspection_failed`). Both pass alone. Candidate stability item for later. — src: codereview_2/codereview.md#Limitations and open items; until: feature closed
