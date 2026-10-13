# Workflow — 19-skills-name-and-invocation

Human decisions, authorizations, and recovery events for this feature and its sibling slice `20-skills-wizard-discovery`.

## Git base

- Resolved commit: `7295a433a4f1f79430b0c5281cb46ab8495b6db6` (`master`, in sync with `origin/master`).
- Pre-existing changes: `tasks/triage-log.jsonl` (the triage line of this request, appended in this session). No other change.

## Decisions

### H-01 — Request and direction (human, 2026-10-13)

The user asked for an init wizard improvement that inspects the skills folder and suggests the snapshot and the resume skills. After the analysis, the user decided: show a list of alternatives; make it generic for every supported harness; keep only the skill **name** in the configuration and let each harness adapter format the invocation with the right character (`/`, `$`, `@`, or an equivalent phrase).

### H-02 — No compatibility with the old format (human, 2026-10-13)

Question: how to store the skill name without breaking configurations that already hold a command? Answer: "Não manter compatibilidade. Ninguem usa ainda." `snapshot.command` and `snapshot.resumeCommand` change meaning to the bare skill name.

### H-03 — Process level (human, 2026-10-13)

Triage rubric level: `sdd-full` (S1, S2, S4, S6 present). The user chose "SDD enxuto" (`sdd-lean`) when asked how to run the change, without seeing the rubric level. The user's choice stands: short PRD and TechSpec, HIL 1 and HIL 2 merged into one decision, independent review kept. Triage line: `tasks/triage-log.jsonl`, 2026-10-13.

### H-04 — Slicing (human, 2026-10-13)

Approved through `sdd-orchestrate-prds`: two slices under the prefix `skills`.

1. `19-skills-name-and-invocation`: the configuration stores only the skill names, each harness adapter formats the invocation, and the zone action, resume text, `doctor`, flags, schema, and README follow; the invocation syntax of the eight harnesses is researched and recorded.
2. `20-skills-wizard-discovery`: a skill catalog port per adapter, name-based scoring, and the wizard list of alternatives. Depends on 19.

### H-05 — Autonomous mode (human, 2026-10-13)

The user asked: "Ative o modo autonomo se der." Mode `auto` is enabled for both slices, with the decision log `autonomous-decisions.md`. This decision authorizes the autonomous decisions within `.claude/skills/sdd-orchestrate-flow/references/autonomous-mode.md`. No commit, push, or other external action is authorized by it.

## Changes to the flow stops

- HIL 1 and HIL 2 are merged (lean). In auto mode the merged gate is decided by the autonomous protocol after the coverage checks.

### A-01 — Merged HIL 1 and HIL 2 (autonomous, AUTO-07, 2026-10-13)

PRD, TechSpec, and task plan approved; implementation and corrections within the contract are authorized. No commit, push, or other external action is.

### R-01 — Review 1 received (delegated reviewer, 2026-10-13)

`codereview_01/codereview.md` status `REJECTED`, `Execution: delegated reviewer`. Worktree after the review matched the state recorded before it (status list identical, HEAD `7295a43`). One block: CR-01 (README option table, FR-08/T05); CR-02..CR-06 are Low. Routed to a correction round (`sdd-plan-corrections`, then `sdd-execute-corrections`) inside the HIL 2 authorization (A-01).

### R-02 — Corrections planned (autonomous, AUTO-11, 2026-10-13)

`codereview_01/task_01.md` (CR-01, README option row) and `task_02.md` (CR-02, schema `pattern`/`maxLength`). CR-03..CR-06 recorded as accepted open items. Execution is inside the HIL 2 authorization (A-01); no commit, push, or external action.

### R-03 — Corrections of codereview_01 executed (2026-10-13)

`codereview_01/done/task_01.md` (CR-01) and `task_02.md` (CR-02) complete. Integrated state: `npm run build`, `schemas:check`, `lint`, `typecheck`, and `npm run coverage` pass (258 files, 1342 tests, 95.98%). Re-review `codereview_02` delegated to a new reviewer; CR-03..CR-06 stay accepted open items (AUTO-11).

### R-04 — Re-review received (delegated reviewer, 2026-10-13)

`codereview_02/codereview.md` status `APPROVED WITH RESERVATIONS`, `Execution: delegated reviewer`; worktree after the review matched the recorded state. No block; four Low optional items accepted (AUTO-12). CR-01 and CR-02 of review 1 verified closed. Next: CLI QA (TechSpec TC-13 is an end-to-end case).

### R-05 — QA 1 received (delegated QA runner, 2026-10-13)

`qa_01/qa.md` status `REJECTED`, `Execution: delegated QA runner`; worktree unchanged by the run. BUG-01 (Low, FR-02): flag error without flag or file name. Corrected in `qa_01/done/task_01.md` (AUTO-13); full build and coverage pass (258 files, 95.99%). New review `codereview_03` and a new QA run follow, in contexts that did not make the correction. The QA runner reports one exploratory `init` run in a temporary repo with the real user environment before it isolated HOME; its plan listed only project paths and the user-level files' modification times predate it (limitation to show at HIL 3).

### R-06 — Review 3 received (delegated reviewer, 2026-10-13)

`codereview_03/codereview.md` status `APPROVED WITH RESERVATIONS`, `Execution: delegated reviewer`; worktree after the review matched the state recorded before it (84 paths). BUG-01 closed; four Low optional items accepted (AUTO-14). Next: new QA run `qa_02`.

### R-07 — QA 2 received and automatic acceptance (2026-10-13)

`qa_02/qa.md` status `APPROVED`, `Execution: delegated QA runner`; worktree unchanged by the run (84 paths). Automatic acceptance recorded (AUTO-15). No commit, push, or external action was made or authorized. ADR candidates: none recorded.
