# Context snapshot — prd-15-configuracao-guiada-higiene-e-exclusao

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-08
- stage: acceptance
- stage_source: qa_01/qa.md
- covers_through: T08 done; codereview_01 APPROVED WITH RESERVATIONS (accepted); qa_01 APPROVED
- authored_code: yes
- git_head: c845728
- worktree: all T01..T08 changes uncommitted (src, tests, schemas/context-brake.config.schema.json, README.md, docs/research/harness-integrations.md) plus foreign untracked .agents/skills/chat-clean/, tasks/prd-11-reinicio-automatico-no-claude-code/rtk/; new tasks/prd-15-*, tasks/prd-16-*; modified tasks/triage-log.jsonl
- next_step: sdd-orchestrate-flow — HIL 3 acceptance, then close (checkpoint completed, snapshot closed)
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

- Why next: review closed the automatic cycle with reservations; the human decides whether to correct any of CR-01..CR-04 (all Low) or finalize.
- Read first: checkpoint.json, codereview_01/codereview.md (Findings), workflow.md.
- Known change points: CR-01 `src/core/services/installation-service.ts:75` (removal harness shown as "planned" beside its excluded line); CR-02 `src/infrastructure/harnesses/common/codex-hooks-updater.ts` private `removeOwnedFromEvent` duplicates the shared helper; CR-03 CRLF byte tests only for Claude; CR-04 fixtures inline instead of under tests/fixtures/harnesses/.
- Applicable entries: D-03, L-05, L-07, O-01.
- Watch out: if corrections are chosen, run sdd-plan-corrections then sdd-execute-corrections, then a NEW delegated reviewer; QA (TC-17) runs after the review cycle closes.

## Decisions

- [D-03] (when: now) DEC-HIL-02: init meets FR-01 through the preview; remove reads tolerantly; the PRD file is unchanged, so reviewers read FR-01 with techspec DEC-03/DEC-12 — src: workflow.md#human-decisions-log; until: feature closed

## Learnings

- [L-02] (when: on-run: npm test) Single-file runs use `npm test -- <path>`; ESLint enforces max-lines-per-function 30 and max-lines 100 (code lines) even in tests, and function declarations at module level — src: package.json; until: next session
- [L-05] (when: on-select: QA) `remove` reports `MODIFIED_OWNED_ASSET` and keeps the config when its sha differs from the manifest asset sha. QA fixtures that edit the config after `init` must also rewrite the manifest asset sha (see `writeEarlierBuildConfig` in tests/integration/config-repair-errors.test.ts) — src: done/task_01.md#handoff; until: QA done
- [L-07] (when: on-edit: tasks/prd-15-*/task_*.md) Write handoff text with the Edit tool; backticks inside `node -e "..."` in bash are executed as commands — src: —; until: next session
- [L-08] (when: on-run: npm run test:budget) Budget measured 87.4 s after T08 (one 126 s reading during T02 was machine load); coverage 92 to 105 s — src: done/task_08.md#handoff; until: QA done

## Code map

- [M-01] (when: on-select: QA) Shipped surface: `doctor` finding with remediation; `remove` tolerant (`ProjectConfigStore.readTolerant`); `init` preview `drop unrecognized keys:`; `hook-event-cleanup.ts` wired in Claude/Codex/Cursor/Antigravity; `excludedHarnesses` (`harness-exclusion.ts`, `harness-removal.ts`, `no-harness-finding.ts`, `detection-text.ts`) — src: tasks.md; until: QA done

## Open threads

- [O-01] (when: now) Reservations HIL pending for CR-01..CR-04; pre-existing quirk outside scope: `remove` deletes a user-modified runtime asset while reporting it will not be removed (suggest a separate fix) — src: done/task_06.md#handoff; until: HIL answered
