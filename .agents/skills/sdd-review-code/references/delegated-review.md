# Delegated review

Protocol for the authoring session that reaches the review and, instead of ending the session, hands `sdd-review-code` to a **delegated reviewer**: a fresh-context subagent, in the same worktree, that runs the whole skill, writes the report, and returns. The review's independence comes from the context, not the session: the reviewer inherits no conversation, reasoning, or summaries from the author, and derives what it judges from the sources. Delegation therefore satisfies the independence rule of the session pause, and the flow moves on without a mandatory stop. `sdd-execute-qa` follows the same protocol, with the substitutions in [QA](#qa).

## Eligibility

The host must launch a subagent that:

- starts with a **fresh context**. A subagent that inherits the conversation (`fork` in Claude Code) carries the author's framing and is not a reviewer;
- works in the **same worktree**, because the review judges the uncommitted diff against `--base`. An isolated worktree or a copy of the repository is not eligible;
- reads and writes files and runs build and test commands. A read-only explorer (`Explore` in Claude Code) is not eligible.

In Claude Code, `Agent` with the general-purpose `subagent_type` (`general-purpose`) and no `isolation` qualifies; in Codex, a new agent with no history. Preserve the inherited model. Without an eligible subagent, or when the user asked for the review in a new session, follow the independence rule as before: a session pause that recommends ending the session.

## Prepare

1. Delegate only with the stage closed: every task in the manifest, or in the report folder during corrections, complete. With a task pending or blocked, the review is not yet the next step and the pause follows the common destinations. Finish the previous unit: writes persisted, no explorer or process running. With the context threshold reached, first write the snapshot, and the checkpoint under the flow, without asking: the delegation result and the report can push the session into `CRITICAL`, where the snapshot can no longer be written. Then delegate anyway, receive, and take the context pause with the next step the status defines.
2. Reserve the next free suffix `codereview_[num]/` under `tasks/prd-[slug]/`, considering all existing folders. Do not create the folder.
3. Record the worktree state for the later check: `git status --porcelain` and the current `HEAD`.
4. Under `sdd-orchestrate-flow`, save the checkpoint with `phase: review`, `safe_to_stop: false`, and an `active_work` item `{kind: "reviewer", handle, owner, scope: "codereview_[num]", state: "running"}`, filling `handle` as soon as the host returns it.

## Reviewer instruction

Send only data, as paths, in this order:

- absolute workspace, feature folder, and slug;
- resolved paths of `.agents/skills/sdd-review-code/SKILL.md` and its `references/TEMPLATE.md`, so the reviewer does not depend on discovering skills;
- `--base` as a resolved commit (`git_base` from the checkpoint or the base the caller recorded);
- the reserved folder `codereview_[num]/` and, in a re-review, the path of the previous review and the corrections folder;
- with `context-snapshot.md` in the feature folder, the path `.agents/skills/sdd-snapshot/references/load.md`;
- the contract below and the return format.

Do not send the conversation, diffs you analyzed, handoff summaries, justifications, or a readiness assessment ("it's ready", "only the review is left"). The reviewer reads handoffs as part of the sources, under the skill's rules.

### Reviewer contract

- Run `sdd-review-code` in full, in step order, as an independent session. Load the snapshot, if any, through the independent-stage filter of `.agents/skills/sdd-snapshot/references/load.md`.
- Write only `codereview_[num]/codereview.md` in the reserved folder.
- You may run the builds, tests, and quality profile commands the review requires, including those that write `dist/`, `coverage/`, or fixtures. Do not edit code, tasks, manifest, handoffs, `workflow.md`, checkpoint, or snapshot, and do not commit, stash, check out, or clean the worktree.
- Do not ask the user and do not run the session pause. A missing source, an unavailable environment, or a doubt becomes a limitation or block in the report, including whatever the skill would record in `workflow.md`.
- Do not delegate to another reviewer. Use read-only explorers only if the host allows them for this subagent; otherwise, direct searches.
- Return: report path, literal status, and one line per block or limitation. Nothing else.

## While the reviewer runs

The authoring session writes nothing to the repository and runs no build or test: any change during the review invalidates the affected part. Wait for the terminal state through the handle; an observation timeout is not completion.

## Receive

1. With the terminal state confirmed, update `active_work` and check the worktree against what Prepare recorded. Expected: the `codereview_[num]/` folder, and the build, test, and fixture outputs of the commands the report records. A change to code, tasks, manifest, handoffs, `workflow.md`, checkpoint, snapshot, or another SDD artifact, or to a file no recorded command explains, is a contaminated review: do not use it as evidence and do not revert it on your own; record it in `workflow.md`, or in the handoff in standalone use, and take it to **exception HIL** with the paths.
2. Read `codereview_[num]/codereview.md` from disk. The subagent's return is a hint; the report is the source. Check that the status is exactly `APPROVED`, `APPROVED WITH RESERVATIONS`, or `REJECTED` and that the report records `Execution: delegated reviewer`.
3. With no report, an incomplete report, or an unrecognizable status, delegate once more, to a new reviewer, reserving the next suffix and recording the incomplete folder as interrupted, without deleting it. If the failure persists, follow the independence rule as with no eligible subagent.
4. Record the status and path where the caller keeps the review result (`review_status` and `sources.review` under the flow) and follow the caller's destination.

The authoring session does not reopen the review or adjust its status: disagreement with a finding goes to `sdd-plan-corrections` as an open item or to the user. Each round uses a new reviewer, including the re-review after corrections.

## QA

When the next step is `sdd-execute-qa` and this session wrote or changed the code under test, delegate it to a **delegated QA runner** by the same protocol, with these substitutions:

- Delegate only after the review cycle closed, as step 1 of `sdd-execute-qa` requires.
- Send `.agents/skills/sdd-execute-qa/SKILL.md` and its `references/TEMPLATE.md`, plus the path of the latest `codereview_[num]/codereview.md` and, in a run after corrections, the previous QA report.
- Reserve `qa_[num]/`. The runner writes only `qa_[num]/qa.md` and `qa_[num]/evidence/`, and copies fixtures into temporary directories outside the worktree. A manual script that needs the user stays `NOT VERIFIABLE` in the report.
- Save the checkpoint with `phase: qa` and an `active_work` item `{kind: "qa-runner", ..., scope: "qa_[num]"}`.
- On receipt, check that the status is exactly `APPROVED`, `REJECTED`, or `BLOCKED` and that the report records `Execution: delegated QA runner`; record it in `qa_status` and `sources.qa` under the flow.
