---
name: sdd-execute-corrections
description: SDD execution when tasks from a code review or QA report need correction; does not create or reclassify findings.
argument-hint: --prd feature-name --report codereview_[num]|qa_[num]
disable-model-invocation: true
---

# Execute SDD corrections

If the caller limits execution to a batch, return after step 5 before starting another batch: `batch-completed` with pending IDs if the batch was approved, or `blocked` with evidence if the batch still has a failure or no task is eligible. When all tasks are complete, execute step 6 before returning. A batch does not end the review or the QA cycle.

1. Fix one report folder by argument or context and require its `codereview.md` or `qa.md`. Inventory root and `done/` tasks by ID, findings, acceptance, dependencies, and files. If ambiguous, request a choice; if the plan is missing, direct to `sdd-plan-corrections`.
   **Output:** exact report, with no duplicates or missing or circular dependencies. If all tasks are complete, continue to joint validation.
2. Select eligible tasks. Delegate one task per subagent using this skill, with the exact path and the instruction to execute **only step 3**, without delegating, reviewing, or moving files. The coordinator executes steps 1, 2, and 4 through 6. Without subagents, execute sequentially and keep review separate from the author.
   Parallelize only without collisions in files, contracts, configuration, and test resources.
   **Output:** batch with exclusive owners and confirmed correction authorization.
3. In the executor, read the stable report and task once per version; then retrieve relevant PRD and TechSpec sections, code, `AGENTS.md`, the applicable `.agents/rules/`, and skills. Trace the cause and implement within the limits. Apply the TechSpec validation, with end-to-end checks following the CLI policy in `AGENTS.md`; for a QA finding, rerun the scenario that exposed it. Record unit, integration, end-to-end, and required manual checks and limitations. Run the quality profile's blocking commands over the files the correction touched: fixing one finding without introducing another is part of the task's acceptance.
   Update only the assigned task and its single `## Handoff` with result, files, commands, validated version, and pending items. Preserve the report, other tasks, and global state.
   **Output:** implementation and evidence, or a reproducible block; the executor returns to the coordinator.
4. Review diff and handoff independently of the author. Reuse proven tests from the same state; run only missing or invalidated checks. Return findings to the same executor; after two attempts without new evidence, record a block and advance independent work. An architecture or scope divergence requires HIL when not covered by existing authorization.
   **Output:** acceptance of each task proven, or a specific pending item; unexecuted essential manual work prevents approval.
5. Move only approved tasks to `done/`, preserving names and checking absolute paths inside the report folder. Preserve the immutable report. Recalculate the DAG from the remaining files.
   **Output:** every approved task moved; pending tasks at the root. On interruption, check report and handoff before inferring completion from the folder.
6. Validate the integrated set without repeating already valid commands. Check every actionable finding and its evidence. In the orchestrated flow, return the execution report so the caller can delegate `sdd-review-code`, and `sdd-execute-qa` again when the source was a QA report; in standalone use, request an independent review by `sdd-review-code`, which creates a new immutable report.
   **Output:** tasks complete with integrated evidence and re-review issued or explicitly returned to the caller; persistent or new findings remain open until a decision.

If the environment prevents acceptance, keep the affected task pending with command, error, and impact. If there is a collision, stop affected writers, wait for completion confirmation, and reconcile changes before resuming sequentially.
