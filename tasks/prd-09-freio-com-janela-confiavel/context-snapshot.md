# Context snapshot — prd-09-freio-com-janela-confiavel

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-09-28
- stage: acceptance
- stage_source: codereview_03/
- covers_through: codereview_03 (APPROVED WITH RESERVATIONS)
- authored_code: yes
- git_head: e0a9604
- worktree: pre-existing `.agents/`, `.context-brake/`, `.gitignore`, `context-brake.config.json`, `tasks/triage-log.jsonl` changes (not this feature); feature diff in `src/`, `tests/`, `schemas/`, `README.md`, `docs/`, `.agents/rules/harness-adapters.md`; `tasks/prd-09-freio-com-janela-confiavel/`
- next_step: sdd-orchestrate-flow step 6 HIL 3 answer (accept the delivery), then close: checkpoint completed, snapshot closed
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

- Why next: reservations finalized (`DEC-HIL-04`); QA skipped (`DEC-HIL-01`); `jev-summary.md` written; integrated check done (no change outside `tasks/` since the green `codereview_03` run). HIL 3 is pending in `checkpoint.json#pending_hil`.
- Skill and unit: `.agents/skills/sdd-orchestrate-flow/SKILL.md` step 6; on acceptance, record `DEC-HIL-05` in `workflow.md`, save the checkpoint `phase`/`status` `completed` with `next_action.kind: close`, and set this snapshot's `status: closed`. Commit, PR, or ADR only if the human asks.
- Read first: `checkpoint.json`, `workflow.md` milestone 14 and `DEC-HIL-04`, `jev-summary.md`.
- Applicable entries: O-04.

## Learnings

- [L-01] (when: on-run: npm run coverage; npx vitest run) The full suite takes 10–15 minutes on Windows; start it with the Bash tool's `run_in_background` (a shell `&` gives no completion notice), and do not pipe it through grep — src: —; until: feature completed
- [L-02] (when: on-run: bash; node -e) Long inline `node -e` scripts or heredocs with backticks and backslashes get mangled in this Bash tool; write the script with the Write tool and run `node file.cjs`; the shell hook also reformats `git diff`, so use `rtk proxy git diff` for a literal diff — src: —; until: feature completed
- [L-04] (when: on-run: npm run coverage; on failure: e2e-support-limitations) `tests/e2e/e2e-support-limitations.test.ts` doctor case runs `init` plus two `doctor` (about 8 s each idle) against a 30 s timeout and timed out in 3 of 5 full runs this session under load; not in the diff; rerun the full suite before treating it as a failure — src: codereview_02/done/task_05.md#handoff; until: feature completed

## Open threads

- [O-03] (when: now) Each re-review goes to a new fresh-context delegated reviewer (`delegated-review.md`); record pre-review worktree hashes before delegating and compare on receipt — src: workflow.md#milestone-history; until: review APPROVED
- [O-04] (when: now) jev shadow: at acceptance write `jev-summary.md` from `jev-log.jsonl` per `.agents/skills/sdd-jev/references/metrics.md` (control: delegated for the reviews) and present it at HIL 3 — src: .agents/skills/sdd-jev/SKILL.md#steps; until: HIL 3
