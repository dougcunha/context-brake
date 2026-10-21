# Context snapshot — prd-24-doctor-fix-command

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-21
- stage: acceptance
- stage_source: qa_01/ (APPROVED)
- covers_through: qa_01
- authored_code: yes
- git_head: 419c0bd
- worktree: uncommitted prd-22, prd-23, and prd-24 diffs: src/, tests/, schemas/, scripts/, README.md, tasks/, .gitignore, docs/
- next_step: — (completed; commit on request through the commit skill)
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

- Why next: tasks T01-T09 done; codereview_04 `APPROVED WITH RESERVATIONS` (routed, A-08); qa_01 `APPROVED`; HIL 3 escalated (AUTO-09) because the TechSpec real-terminal script is not verified.
- Read first: `checkpoint.json` (`pending_hil`), `workflow.md#q-01--qa-received`, `autonomous-decisions.md#auto-09`.
- Known change points: none.
- Applicable entries: O-01, O-02, L-01.
- Watch out: do not end with `[REQUEST_SESSION_RESET]` while the HIL is open.

## Decisions

- [D-01] (when: on-select: HIL 3) Accept only after the user answers; "accept without the manual run" records the script as an accepted open item, then mark checkpoint `completed` and this snapshot `closed` — src: autonomous-decisions.md#auto-09; until: HIL 3 answered

## Learnings

- [L-01] (when: on-run: npm run coverage; npm run test:budget) On this loaded machine coverage takes 193-229 s and test:budget 160-220 s; run only touched suites between tasks — src: workflow.md#a-05--reservations-hil-autonomous-auto-06; until: feature committed
- [L-02] (when: on-edit: tests/**; src/**) Python heredocs turn `\n` inside TS strings into real newlines; use the Edit tool for those lines — src: —; until: next session
- [L-03] (when: on-run: manual fix fixture) The real Claude Code here uses the mod source, so a plain init installs no bridge; the manual fixture uses `--statusline-bridge` — src: —; until: HIL 3 answered

## Code map

## Open threads

- [O-01] (when: now) HIL 3 question waits on the user: run the real-terminal script on the prepared fixture, accept without it, or reject — src: checkpoint.json#pending_hil; until: answered
- [O-02] (when: now) Accepted open items for HIL 3: STATUSLINE_BRIDGE_ABSENT group after opt-out (PRD), coverage/budget wall time (repo owner), tests.md e2e list (repo owner), DEC-06 vs bridge asset path (TechSpec owner), NFR-04 Linux/macOS (CI) — src: workflow.md#a-05--reservations-hil-autonomous-auto-06; until: HIL 3 answered
