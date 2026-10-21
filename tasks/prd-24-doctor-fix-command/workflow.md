# Workflow — prd-24-doctor-fix-command

## Context

- Git base: `419c0bd328b2cd209ed98846e6b50b73ef4664fd` (master).
- Pre-existing changes (not part of this feature): the uncommitted diffs of prd-22 (accepted) and prd-23 (accepted, A-04 there), listed in `tasks/prd-23-doctor-readable-output/workflow.md#context` plus the prd-23 files (`src/cli/`, `src/core/services/active-sessions.ts`, `tests/`, `README.md`); untracked folders `tasks/prd-21-manual-handoff-command/`, `tasks/prd-22-claude-code-version-floor/`, `tasks/prd-23-doctor-readable-output/`. prd-24 builds on the prd-23 worktree state (dependency in `prd.md#constraints-and-dependencies`).
- Mode: `auto` (decision log: `autonomous-decisions.md`).

## Decisions

### H-00 — Slicing (inherited)

- Decision: slice 2 of 2 under prefix `doctor`; no separate triage.
- Provenance: `tasks/prd-23-doctor-readable-output/workflow.md#h-00--slicing-sdd-orchestrate-prds`, 2026-10-21.

### H-01 — Auto mode enabled

- Decision: run the flow in `auto` mode; this authorizes the autonomous decisions of `.claude/skills/sdd-orchestrate-flow/references/autonomous-mode.md`.
- Provenance: 2026-10-21, the user ran `/sdd-orchestrate-flow --prd prd-24-doctor-fix-command --mode auto`.

### A-01 — HIL 1 (autonomous, AUTO-02)

- Decision: `prd.md` approved (sha256 `82f97a24485c599ecad5d7b7f87681e1dfec1fbfc9df6577cd3ef6079beb3019`), FR-11 included.
- Provenance: autonomous, `autonomous-decisions.md#AUTO-02`.

### A-02 — HIL 2 (autonomous, AUTO-03)

- Decision: `techspec.md` (sha256 `a4326cc4c3dc81c11b45313b437b0dacfa02535fa7987dc71dfbd449c4c03f60`) and `tasks.md` (sha256 `cfff25cfb1f2afdce3db841e64f253bc5aef6d3fff3b4f09d154bdbc42a591d0`) approved; implementation and corrections within the contract authorized.
- Provenance: autonomous, `autonomous-decisions.md#AUTO-03`.

### A-03 — CLI QA runs (autonomous, AUTO-04)

- Decision: run `sdd-execute-qa` after the review cycle closes.
- Provenance: autonomous, `autonomous-decisions.md#AUTO-04`.

### R-01 — Review received

- codereview_01: `REJECTED`, Execution: delegated reviewer. Worktree after the review matched the pre-review `git status --porcelain` (the new `codereview_01/` sits inside the untracked feature folder); HEAD unchanged at `419c0bd`. Finding: CR-01 (High, status line `keep` drops the bridge asset from the manifest and the `.gitignore` block). Open items: `STATUSLINE_BRIDGE_ABSENT` group after an opt-out (PRD decision), coverage wall time 188 s, `.agents/rules/tests.md` e2e list.

### A-04 — Corrections planned for codereview_01 (autonomous, AUTO-05)

- Decision: CR-01 → `codereview_01/task_07.md`; executed and moved to `codereview_01/done/`.
- Provenance: autonomous, `autonomous-decisions.md#AUTO-05`; within A-02.

### R-02 — Re-review received

- codereview_02: `APPROVED WITH RESERVATIONS`, Execution: delegated reviewer. Worktree after the review matched the pre-review `git status --porcelain`; HEAD unchanged. codereview_01/CR-01: resolved. Reservations: OI-01, OI-02, OI-03 (optional improvements, test-only).

### A-05 — Reservations HIL (autonomous, AUTO-06)

- Decision: correct OI-01 to OI-03 in `codereview_02/task_08.md`, then delegate a re-review. Accepted open items: `STATUSLINE_BRIDGE_ABSENT` group (PRD decision), `test:budget`/coverage wall time on a loaded machine (repository owner), `.agents/rules/tests.md` e2e list (repository owner), DEC-06 extension to the bridge asset path (TechSpec owner).
- Provenance: autonomous, `autonomous-decisions.md#AUTO-06`.

### R-03 — Re-review received

- codereview_03: `APPROVED WITH RESERVATIONS`, Execution: delegated reviewer. Worktree matched the pre-review `git status --porcelain`; HEAD unchanged. codereview_01/CR-01 and codereview_02/OI-01..OI-03: resolved. Reservation: OI-01 (test factory duplication).

### A-06 — Reservations HIL (autonomous, AUTO-07)

- Decision: correct codereview_03/OI-01 in `codereview_03/task_09.md`, then delegate a re-review.
- Provenance: autonomous, `autonomous-decisions.md#AUTO-07`.

### A-07 — Corrections executed (autonomous, AUTO-06, AUTO-07)

- Decision: `codereview_02/task_08.md` (OI-01..OI-03) and `codereview_03/task_09.md` (OI-01) executed and moved to their `done/` folders.
- Provenance: autonomous, `autonomous-decisions.md#AUTO-06`, `#AUTO-07`.

### R-04 — Re-review received

- codereview_04: `APPROVED WITH RESERVATIONS`, Execution: delegated reviewer, no finding and no optional improvement. Worktree matched the pre-review `git status --porcelain`; HEAD unchanged. Previous items resolved. Reservation: NFR-04 on Linux and macOS (CI).

### A-08 — Reservations HIL, review cycle closed (autonomous, AUTO-08)

- Decision: finalize the review cycle; NFR-04 on Linux and macOS is an accepted open item for CI. Next: delegated CLI QA (`qa_01`).
- Provenance: autonomous, `autonomous-decisions.md#AUTO-08`.

### Q-01 — QA received

- qa_01: `APPROVED`, Execution: delegated QA runner. Worktree matched the pre-QA `git status --porcelain` (the runner reverted a `package-lock.json` line that `npm install --ignore-scripts` added). 13 end-to-end scenarios on the built CLI pass on Windows (Git Bash; 2 also in PowerShell). Not verifiable: the TechSpec real-terminal script (no human at a terminal), the clack `askUi` path, Linux and macOS.

### E-01 — HIL 3 escalated (AUTO-09)

- Pending: human acceptance with the real-terminal script (fixture prepared in the session scratchpad). Snapshot: `context-snapshot.md`.

### H-02 — HIL 3 accepted (human)

- Decision: delivery accepted without the real-terminal script; the script (clack `askUi` path) stays an accepted open item, with the other A-05 and A-08 items. Evidence: `codereview_04/codereview.md` (APPROVED WITH RESERVATIONS), `qa_01/qa.md` (APPROVED).
- Provenance: 2026-10-21, question tool answer "Aceitar sem o roteiro".
