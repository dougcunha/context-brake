# Context snapshot — prd-17-ignorar-arquivos-do-contextbrake-no-git

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-09
- stage: acceptance
- stage_source: qa_02/qa.md
- covers_through: HIL 3 accepted (DEC-HIL-07); feature completed
- authored_code: no
- git_head: 5c97f37
- worktree: uncommitted prd-17 work (src/, schemas/, README.md, AGENTS.md, .agents/rules/, tests/, tasks/prd-12-*, tasks/prd-17-*); foreign untracked .agents/skills/chat-clean/ and tasks/prd-11-reinicio-automatico-no-claude-code/rtk/; local commit 5c97f37 not pushed
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

- Why next: codereview_05 and qa_02 are APPROVED; only the human acceptance is left.
- Read first: checkpoint.json, qa_02/qa.md#summary, workflow.md#milestones.
- Known change points: none until the QA status is known.
- Applicable entries: L-04, O-01, O-02.
- Watch out: QA needs a real `git init` folder and the built CLI; do not run a real `init` on this repository (its `.claude` is an MSYS symlink).

## Decisions

- [D-01] (when: now) Decided by the person: file-by-file managed block in the root `.gitignore`, on by default, assistant question preselected, `--no-gitignore` opt-out stored as `gitIgnore: false`; HIL 1, HIL 2, exception HIL, and reservations HIL answered (DEC-HIL-01..04) — src: workflow.md#human-decisions-log; until: feature closed

## Learnings

- [L-01] (when: on-edit: README.md; tasks/**) The working tree is CRLF almost everywhere but README.md must stay LF (README tests match `
`); edit with the Edit tool or Python with newline='' handling, never plain text-mode writes — src: —; until: feature closed
- [L-02] (when: on-run: npm test; npm run lint; npm run coverage) Single-file runs use `npm test -- <path>`; ESLint caps functions at 30 lines (a `describe` callback counts) and files at 100 code lines; suite wall time swings 105 to 250 s with machine load; the last green coverage run: 258 files, 94.78 % lines, 131 s — src: package.json; until: feature closed
- [L-03] (when: on-select: CR-01; on-edit: README.md) The runtime state files are 3, not 2: `claude-mod-install.json`, `claude-statusline.json`, and `claude-statusline-opt-out.json` (written when the status line bridge is off); `gitignore-plan.ts` lists every planned or existing file under `.context-brake/runtime/` — src: prd.md#assumptions; until: feature closed
- [L-04] (when: on-select: BUG-01; on-edit: src/core/services/gitignore-plan.ts) Node reports a Windows junction and a directory symlink both as symbolic links; Git for Windows walks a junction as a folder but treats a directory symlink as one entry; `attemptLink` in tests/helpers/link-capability.ts makes a junction on win32 — src: qa_01/evidence/S11-junction-repro.txt; until: feature closed

## Open threads

- [O-01] (when: now) The GITIGNORE_NO_GIT informational finding appears for every init outside a Git working tree (PRD FR-07) — src: done/task_03.md#handoff; until: feature closed
- [O-02] (when: now) The local commit 5c97f37 (ignore the repository's own install) is not pushed by the person's choice; its manual `.gitignore` lines stay because this repository's `.claude` MSYS symlink defeats path resolution — src: done/task_06.md#handoff; until: feature closed
