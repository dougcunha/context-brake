# Context snapshot — prd-16-configuracao-guiada-assistente-no-init

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: superseded
- generated: 2026-10-08
- stage: planning
- stage_source: tasks/triage-log.jsonl (2026-10-08 line)
- covers_through: prd-15-configuracao-guiada-higiene-e-exclusao/prd.md
- authored_code: no
- git_head: c0c48bb
- worktree: untracked .agents/skills/chat-clean/ and tasks/prd-11-reinicio-automatico-no-claude-code/rtk/ (foreign); this folder
- next_step: sdd-orchestrate-prds — draft prd-16-configuracao-guiada-assistente-no-init; then single HIL 1 for both under sdd-orchestrate-flow
- other_eligible: —
- superseded_by: prd-15-configuracao-guiada-higiene-e-exclusao/context-snapshot.md (prd-16 resumes after prd-15)

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

- Why next: slicing approved (D-01); prd-15 written; prd-16 is the last slice.
- Read first: tasks/triage-log.jsonl (last line); .agents/skills/sdd-create-prd/SKILL.md and its template.
- Known change points: src/core/services/installation-builder.ts:35 (activeHarnesses union); src/infrastructure/runtime/runtime-composition.ts:31 (loadRuntimeConfiguration, strict schema); src/cli/confirmation.ts:11-20 (readline, isTTY); src/cli/init-arguments.ts:17-24 (init flags).
- Applicable entries: D-01, D-02, O-01.
- Watch out: prd-12 DEC-PD-03 vetoed migration and backward compatibility; the obsolete-keys handling must be reconciled with it as a product decision.

## Decisions

- [D-01] (when: now) Slicing approved ("2 fatias (mais agrupado)"): prd-15-configuracao-guiada-higiene-e-exclusao owns O6 actionable error or offer to drop obsolete config keys, O7 cleanup of hook registrations for retired events, O8 persistent exclusion of a detected harness; prd-16-configuracao-guiada-assistente-no-init owns O1 wizard questions, O2 equivalent command, O3 TTY or --interactive trigger, O4 Git Bash TTY probe, O5 --max-restarts, and depends on prd-15 — src: tasks/triage-log.jsonl; until: both PRDs written
- [D-02] (when: now) Triage HIL 0: sdd-full sliced through sdd-orchestrate-prds — src: tasks/triage-log.jsonl; until: recorded in workflow.md

## Open threads

- [O-01] (when: now) Evidence case TokenHound (2026-10-08): INVALID_CONTEXTBRAKE_CONFIG on stateStorage, instructionFiles, brake, lightMode, runner; stale Claude Code PreToolUse entry kept by init; opencode re-activated by detection despite --exclude-harness — src: tasks/triage-log.jsonl; until: prd-15 written
