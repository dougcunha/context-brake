# Context snapshot — prd-02.1-freio-por-uso-medido

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: closed
- generated: 2026-09-25
- stage: acceptance
- stage_source: qa_01/
- covers_through: qa_01
- authored_code: no
- git_head: 5492604
- worktree: uncommitted T01–T05 diff (src/, tests/, schemas/, docs/, README.md, context-brake.config.json, .agents/rules/code-standards.md) on top of the prd-06 merge; 7 files still flagged unmerged in the index (content resolved); untracked tasks/prd-02.1-freio-por-uso-medido/ and new files; stash@{0} (autostash) kept
- next_step: — (feature completed, DEC-HIL-07)
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

- Why next: codereview_01 (APPROVED WITH RESERVATIONS, OI-01..OI-03 accepted by DEC-HIL-05) and qa_01 (APPROVED, manual acceptance passed under DEC-HIL-06) close review and QA.
- Skill and unit: HIL 3 under `sdd-orchestrate-flow`; on acceptance set checkpoint `completed` and this snapshot `closed`.
- Read first: qa_01/qa.md (Summary, Limitations), codereview_01/codereview.md (Findings).
- Applicable entries: O-02, O-05, O-06, O-07.
- Then: commit and push only if the user asks; Linux/macOS CI runs after the push.

## Decisions


## Learnings

- [L-01] (when: on-run: npm run schemas:check; npm run build) `npm run build` regenerates schemas and runtime assets. E2E tests run the built hooks, so rebuild before running tests/e2e or the integration suites that spawn hooks — src: —; until: feature done
- [L-03] (when: on-run: bash heredoc; python -) Long heredocs or `node -e` scripts with nested quotes fail in the Bash tool; write the script into the scratchpad and run it. `cat > file` without input hangs the shell — src: —; until: feature done
- [L-05] (when: on-run: npm run lint) eslint `max-lines` counts non-blank lines (limit 100), `no-restricted-syntax` rejects module-level arrow functions, and `no-unused-vars` rejects `_`-prefixed destructured discards; the QA-08 reservation counts raw lines — src: —; until: feature done
- [L-06] (when: on-run: npm run coverage) The full coverage run takes about 10 minutes; start it in the background. The `[ERROR] INVALID_ARGUMENTS` lines in its log are expected CLI test output — src: —; until: feature done
- [L-08] (when: on-run: regenerate protocol) Regenerate `docs/context-brake-protocol.md` with `npx tsx -e` importing `renderProtocol` and `DEFAULT_CONFIG` from `src/**.ts` and writing the file; `protocol-service.test.ts` checks byte equality — src: —; until: feature done
- [L-09] (when: on-run: npm run coverage; on failure: boot-git-delivery) Under full parallel load, `tests/integration/boot-git-delivery.test.ts` availability cases can fail (boot without `## Repository state`); they pass in isolation and on rerun, and this feature touches no boot code — src: codereview_01/codereview.md#Limitations and open items; until: feature done

## Code map

- [M-01] (when: on-edit: src/core/services/**) `zone-classifier.ts:turnLimits/redStartTurn` is the single source for optional turn limits; `session-zone.ts:readZone` is the only classification path, used by the engine and the runner (`wrap-telemetry.ts`) — src: —; until: changed files overlap
- [M-03] (when: on-edit: src/core/services/**; src/infrastructure/runner/**) Plan presence: only `PlanPresence.exists()` (prd-06); `zone-guidance.ts:resolveGuidance({..., zone})` chooses delegated/withPlan/withoutPlan; the block receives `action` — src: done/task_04.md#Handoff; until: changed files overlap
- [M-04] (when: on-edit: src/core/services/config-legacy-checks.ts; installation-builder.ts; doctor-checks.ts) Legacy turn migration lives in `config-legacy-checks.ts` (`checkLegacyTurnLimits`, `normalizeTurnLimits`); `doctor-checks.ts` is at 99 lines — src: done/task_05.md#Handoff; until: changed files overlap

## Open threads

- [O-02] (when: now) T01–T05 are not committed yet; the user decides when to commit — src: —; until: commit
- [O-05] (when: now) Git index still flags 7 files as unmerged (configuration.ts, block-message.ts, brake-engine.ts, session-zone.ts, telemetry-block.ts, wrap-telemetry.ts, runtime-composition.ts) although their content is resolved; `git add` on them and dropping stash@{0} are the user's call — src: workflow.md#Events (EV-11, EV-14); until: commit
- [O-06] (when: now) Manual acceptance done (qa_01); Linux/macOS CI matrix still pending until push — src: qa_01/qa.md#Limitations and open items; until: CI green
- [O-07] (when: qa; acceptance) Reservations OI-01..OI-03 of codereview_01 accepted as open items (DEC-HIL-05); list them at HIL 3 — src: workflow.md#Human Decisions Log; until: HIL 3
