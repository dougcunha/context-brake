---
name: sdd-execute-qa
description: SDD QA when an implemented and reviewed feature must be validated end to end by running the built CLI against fixture repositories; does not fix defects.
argument-hint: --prd feature-name
disable-model-invocation: true
---

# Execute SDD QA

1. Require `prd.md`, `techspec.md`, and `tasks.md` under `tasks/prd-[slug]/`, and read the latest `codereview_[num]/codereview.md`. Read PRD and TechSpec once per version; then manifest, `done/` tasks, and handoffs. QA runs only after a review cycle closed as `APPROVED` or with decided reservations; otherwise return a block to the caller.
   **Output:** sources, latest review, and validated code state identified; a missing source blocks QA with the exact path.
2. Build a checklist with one item per PRD acceptance obligation (`FR-NN`, or `RF-NN` and `CA-NN` in legacy PRDs) and link the TechSpec test cases (`TC-NN`) that verify it. Mark which items need end-to-end execution, which are proven by unit or integration evidence from the same code state, and which need manual acceptance.
   **Output:** every acceptance obligation has a verification route; none disappears because it is expensive to run.
3. Prepare the environment with the commands in `AGENTS.md`: install dependencies, build the CLI, and copy each fixture repository from `tests/fixtures/` into its own temporary directory. Record Node.js version, platform, commit, and fixtures. Never run QA against a real repository or a user-level harness configuration.
   **Output:** reproducible environment recorded; a missing prerequisite blocks only the dependent items.
4. Run each end-to-end scenario as a child process against its fixture copy and capture the exact command, exit code, stdout, stderr, and resulting files. Check the observable result the obligation requires, including `--json` output against its schema, exit codes, text labels with `NO_COLOR` set, and byte-for-byte preservation of content ContextBrake does not own. Cover the platforms the TechSpec requires and record the ones that could not run.
   **Output:** every end-to-end item marked `PASSED`, `FAILED`, or `NOT VERIFIABLE`, with evidence saved under `qa_[num]/evidence/`.
5. Run the manual acceptance scripts the TechSpec lists, such as a real harness session where a fixture cannot represent the behavior, only when the environment and authorization exist. Record steps, observed result, and who ran it; an essential script that did not run stays `NOT VERIFIABLE`.
   **Output:** manual items executed with evidence, or explicitly pending.
6. Record each failure as `BUG-NN` with obligation, reproduction command, expected and actual result, evidence path, severity, and suspected area. Do not change code, tests, tasks, or reviews: corrections belong to `sdd-plan-corrections` and `sdd-execute-corrections`, using this report as the source.
   **Output:** reproducible findings, with no fix attempted by QA.
7. Read [references/TEMPLATE.md](references/TEMPLATE.md) in full when issuing the report. Reserve the next free numeric suffix under `qa_[num]/`, considering all existing folders, and write a new `qa.md` with exactly one status:
   - `APPROVED`: every acceptance obligation verified and passing, including essential manual items.
   - `REJECTED`: any failed obligation or `BUG-NN`.
   - `BLOCKED`: no failure found, but essential evidence could not be produced; the report names the missing environment or decision.
   **Output:** immutable report with checklist, runs, findings, and status; the report path returns to the caller.

In a run after corrections, reference the previous QA report, mark each earlier `BUG-NN` as resolved, persistent, or not verifiable, and rerun every affected scenario. A code change after this report invalidates it.
