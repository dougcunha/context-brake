# Workflow — 20-skills-wizard-discovery

This slice shares its decisions with `19-skills-name-and-invocation`: see `tasks/prd-19-skills-name-and-invocation/workflow.md` (H-01 to H-05) and its `autonomous-decisions.md`. Mode `auto` is inherited.

## Dependency

- Starts only after slice 19 is implemented and accepted: the wizard stores skill names and the adapters format the invocation.

### A-01 — HIL 1 (autonomous, AUTO-16, 2026-10-13)

PRD approved (sha256 403df4ed21f910929a457f5b4a302372e06aaceabdc3b675b4688de6a85bff4a). Level sdd-lean as H-03: HIL 2 is merged with this gate after the TechSpec and the task plan. No commit, push, or external action is authorized.

### A-02 — Merged HIL 2 (autonomous, AUTO-17, 2026-10-13)

TechSpec (sha256 83142ef02cb29c80b7c2a899072f847b715b73b3d1b9e6cc3b4ac24b409e4f85) and plan (tasks.md sha256 2b1b3bdc8b3a0fcd0accfb4117a34540c6818f5de362210f00d1b0af6f4ac7c8) approved; implementation and corrections within the contract are authorized; CLI QA runs after the review. No commit, push, or external action is authorized.

### R-01 — Implementation complete (2026-10-13)

T01 to T05 are in `done/`. Integrated gates pass: lint, typecheck, build, `schemas:check`, `coverage` (267 files, 96.06%), `test:budget`, `package:smoke`, `test:bench`. The files this slice created or changed are listed in `slice-scope.txt` (files whose hash differs from `baseline-hashes.txt`, taken before T01); the rest of the uncommitted worktree is slice 19, already accepted (AUTO-15). The review of this slice runs against `--base 7295a43` limited to that scope. Deviations from the TechSpec text: the resume question offers `none` (FR-05), and `rankSkills` takes only `{ exclude }` (see `tasks.md`).

### R-02 — Review 1 received and corrected (delegated reviewer, 2026-10-13)

`codereview_01/codereview.md` status `REJECTED`, `Execution: delegated reviewer`; worktree unchanged by the review. Blocks CR-01 (Medium) and CR-02, plus test gaps CR-03 and CR-04, corrected in `codereview_01/done/task_01.md` (AUTO-18). Coverage 268 files, 96.07%. Re-review `codereview_02` delegated to a new reviewer.

### R-03 — Re-review received (delegated reviewer, 2026-10-13)

`codereview_02/codereview.md` status `APPROVED WITH RESERVATIONS`, `Execution: delegated reviewer`; worktree unchanged by the review. CR-01..CR-04 of review 1 closed; five optional items accepted (AUTO-19). Note from the review: `test:budget` failed once at 179.1 s of 180 s under machine load and passed on rerun (122.7 s). Next: CLI QA `qa_01`.

### R-04 — QA 1 received and automatic acceptance (2026-10-13)

`qa_01/qa.md` status `APPROVED`, `Execution: delegated QA runner`. The worktree status was unchanged by the run; the only content difference since the last recorded hashes is `autonomous-decisions.md` of the slice 19 folder, which this session appended to (AUTO-19) before the run. Automatic acceptance recorded (AUTO-20). No commit, push, or external action was made or authorized. ADR candidates: none recorded.
