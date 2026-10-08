# Context snapshot — prd-14-refatoracao-modo-leve-reinicio-multi-harness

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-07
- stage: completed
- stage_source: qa_02/
- covers_through: T24 (codereview_08/done/ T24)
- authored_code: yes
- git_head: a31e183
- worktree: uncommitted feature diff in src/, assets/, scripts/, tests/, docs/research/, README.md, tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/; pre-existing untracked tasks/prd-11-reinicio-automatico-no-claude-code/rtk/
- next_step: — (feature completed, DEC-HIL-08; manual acceptance owed by the person; OpenCode 2.x migration PRD proposed)
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

- Why next: review cycle closed (codereview_09) and qa_02 APPROVED; HIL 3 acknowledges the TechSpec amendments, DEC-HIL-05..07, accepted open items, and manual acceptance.
- Read first: `workflow.md` (decisions and last milestones); `qa_02/qa.md#conclusion`; `techspec.md` Implementation deviations.
- Known change points: none pending.
- Applicable entries: O-04, O-05, O-07, O-08, L-04, L-05.
- Watch out: `rounds_without_progress` = 0. With qa_02 APPROVED, HIL 3 presents the TechSpec amendment list (O-04), DEC-HIL-05 to DEC-HIL-07, the accepted open items, and manual acceptance.

## Decisions

- [D-02] (when: on-select: review; DEC-19; DEC-20; DEC-21) Destinations: Pi automatic, Oh-My-Pi editor prefill + Enter, OpenCode no restart (follow-up PRD) — src: techspec.md#probe-results-t01-2026-10-07-and-amendments; until: feature closed

## Learnings

- [L-04] (when: on-edit: src/core/services/zone-guidance.ts) Telemetry block budget is 60 tokens / 220 chars worst case — src: done/task_02.md#handoff; until: feature closed
- [L-05] (when: on-run: npx vitest run tests/integration/runtime-in-process.test.ts) That suite imports dist/; run `npm run build` first — src: —; until: feature closed

## Open threads



- [O-05] (when: now) Propose the OpenCode 2.x migration PRD after prd-14 (DEC-HIL-04) — src: workflow.md#human-decisions-log; until: PRD created
- [O-07] (when: on-select: review) Reviewer exclusions: untracked tasks/prd-11-…/rtk/ is foreign; tasks/prd-14-…/probe/ is throwaway (NFR-03); OpenCode 2.x load failure is pre-existing (DEC-HIL-04); Codex `"hooks": {}` → `{\n  }` after remove is pre-existing updater formatting — src: done/task_09.md#handoff; until: feature closed
- [O-10] (when: now) Manual acceptance owed by the person (DEC-HIL-08): real Pi session to RED with handoff and automatic restart; Oh-My-Pi prefill + Enter; Codex `/new` — src: workflow.md#human-decisions-log; until: the person reports it
