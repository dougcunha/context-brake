# Context snapshot — prd-23-doctor-readable-output

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-21
- stage: acceptance
- stage_source: codereview_02/ (APPROVED)
- covers_through: codereview_02
- authored_code: yes
- git_head: 419c0bd
- worktree: prd-22 diff plus this feature: src/cli/, src/core/services/active-sessions.ts, tests/, README.md, tasks/
- next_step: — (completed; commit on request; next feature: prd-24-doctor-fix-command after its PRD approval)
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

- Why next: the feature is accepted (A-04); nothing is committed.
- Read first: `checkpoint.json`, `tasks.md`, `workflow.md`.
- Applicable entries: L-01, O-01.

## Decisions

- [D-01] (when: on-select: prd-24) The structured `fix` field, the schema change, and the "fixable" marker belong to prd-24; problem rows keep `notes` as an array for prd-24 (DEC-06) — src: tasks/prd-23-doctor-readable-output/techspec.md#technical-decisions; until: prd-24 TechSpec written

## Learnings

- [L-01] (when: on-run: npm test; npm run coverage) Run only the touched suites by path between tasks (user memory); `npm run coverage` took 135.7 s on 2026-10-21; Python heredocs turn `\n` inside quoted TS strings into real newlines, so edit regexes with the Edit tool — src: tasks/prd-23-doctor-readable-output/tasks.md#problems-and-solutions; until: prd-23 done

## Code map

## Open threads

- [O-01] (when: now) Auto mode (H-03); QA does not run (A-02); automatic acceptance follows an `APPROVED` review — src: tasks/prd-23-doctor-readable-output/workflow.md#decisions; until: acceptance
- [O-02] (when: on-select: prd-24) prd-24 PRD is not approved; FR-11 (fix needs an existing installation) is an author decision to confirm — src: tasks/prd-24-doctor-fix-command/prd.md#assumptions-and-sources; until: prd-24 approval
- [O-03] (when: now) prd-21-manual-handoff-command is open with only prd.md; prd-22 is accepted and not committed — src: tasks/prd-22-claude-code-version-floor/context-snapshot.md; until: commit
