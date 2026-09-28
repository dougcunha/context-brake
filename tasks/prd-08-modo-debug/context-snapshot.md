# Context snapshot — prd-08-modo-debug

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-09-28
- stage: acceptance
- stage_source: codereview_02/
- covers_through: codereview_02
- authored_code: no
- git_head: 791defe
- worktree: pre-existing `.agents/`, `.context-brake/`, `.gitignore`, `context-brake.config.json` changes (not this feature); feature diff in `src/`, `tests/`, `schemas/`, `README.md` (uncommitted, new files intent-to-add); `tasks/prd-08-modo-debug/`
- next_step: — (feature completed, DEC-HIL-14)
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

- Why next: `codereview_02` is `APPROVED` (CR-01 resolved, CR-02 accepted by `DEC-HIL-13`). CLI QA is skipped by `DEC-HIL-12`, and `jev-summary.md` is written, so HIL 3 is the only open gate.
- Skill and unit: `sdd-orchestrate-flow` step 6, HIL 3. On acceptance, mark the checkpoint `completed`, `next_action.kind: close`, and this snapshot `closed`. Commit or PR only if the user asks.
- Read first: `codereview_02/codereview.md#Summary,Limitations`, `jev-summary.md`, `workflow.md#Milestone History item 9`.
- Applicable entries: O-03, O-04.

## Decisions

## Learnings

- [L-04] (when: on-run: npm run coverage) The full suite takes about 8 minutes on Windows; run it in the background and do not pipe it through grep, which hides the vitest exit code — src: tasks.md#problems-and-solutions; until: feature completed
- [L-06] (when: on-run: bash) In this Bash tool, a long quoted heredoc containing backticks and `|` failed to parse ("unexpected EOF"); write long Markdown with the Write tool instead — src: —; until: feature completed

## Code map

## Open threads

- [O-03] (when: now) jev shadow: `jev-summary.md` is written; present it at HIL 3. Adopting a point in `active` or dropping the mode is a human decision for `workflow.md` — src: jev-summary.md; until: acceptance
- [O-04] (when: now) Accepted open items at HIL 3: `codereview_01/CR-02` (three files at 100 lines), the optional manual acceptance (real Claude Code session printing the line) was not executed, and Linux and macOS are covered only by CI — src: codereview_02/codereview.md#limitations-and-open-items; until: acceptance
