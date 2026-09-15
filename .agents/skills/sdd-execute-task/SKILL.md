---
name: sdd-execute-task
description: Execution of one exact SDD task in the current session, standalone or as a step of sdd-orchestrate-tasks; does not plan or approve its own work.
argument-hint: --task tasks/prd-[NN]-name/task_01.md
---

# Execute an SDD task

1. Resolve one `tasks/prd-[slug]/task_[num].md`. Require the PRD, TechSpec, and feature manifest. When `context-snapshot.md` exists in the feature folder and no orchestrator in this session already loaded it, apply the load protocol in `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`. Read stable sources once per version in PRD, TechSpec, task order; consult state afterward. Confirm completed dependencies and a pending task. A task in `done/` is only reported.
   **Output:** exact contract, satisfied dependencies, and identified write scope.
2. Read `AGENTS.md`, the applicable `.agents/rules/`, and only the skills relevant to the change. Inspect the worktree, callers, and affected tests; preserve pre-existing changes. Answer targeted questions with direct searches; send a read-only explorer subagent only for sweeps across many files, and verify the lines it cites before editing. Map every acceptance item to implementation and evidence.
   **Output:** known change points; source or write conflicts raised before mutation.
3. Implement the smallest coherent change and behavior tests proportional to risk. Mark subtasks only with evidence. Edit only assigned files and the task itself; the manifest and moves belong to the orchestrator's record step, or to the caller in standalone use.
   **Output:** implementation limited to the contract, with no global state changed.
4. Apply the TechSpec profile. End-to-end checks follow the CLI policy in `AGENTS.md`: run the built CLI against fixture repositories only for the flows the task lists. Preserve acceptance with relevant unit, integration, and manual scripts; unexecuted manual work remains pending. Use the commands in the Commands section of `AGENTS.md`.
   Run checks required by the diff; reuse evidence only from the same code, configuration, platform, and environment. Zero tests or a listing are not success. Record pre-existing failures separately.
   Also run the TechSpec quality profile commands, scoped to the files you touched. Empty output settles the matter. Check every hit against the Terrain baseline: a hit already listed there is prior debt and not yours, unless your change aggravated it. A new blocking hit without a `DEC-NN` covering it is your defect: fix it before the handoff; do not report it as a pending item. A new reservation hit remains and goes to the handoff with file and line. A profile or baseline missing from the TechSpec is recorded as a gap, not filled in on your own.
   **Output:** every acceptance item has evidence or a reproducible block; no unjustified blocking hit survives in the diff.
5. Update one `## Handoff`: result, files, commands, results, validated version, quality profile reservation hits, and pending items. Return a short summary and path for review; on retry, change the same section and preserve valid evidence. In standalone use, finish with the session pause from `session-continuity.md` (stage `tasks`, `authored_code: yes`), naming the review as next step.
   **Output:** handoff sufficient to review diff, tests, and acceptance; the task remains at the root until approval.

## Decisions and failures

- Record an ADR candidate only for a durable decision with alternatives and trade-offs governing contracts, boundaries, or quality attributes. Use `TXX-ADR-NN`, title, context, decision, alternatives, consequences, evidence, and TechSpec relationship; otherwise use `None`. Promotion happens only after acceptance, when requested.
- An architectural or scope deviation requires a human decision unless existing authorization covers it. Record the conflict and bring it to the user or the caller; do not invent approval.
- An unavailable environment or pending dependency keeps affected acceptance unmarked; record command, error, and impact. A retry fixes only the failure; after two attempts without new evidence, raise a block for a decision.
