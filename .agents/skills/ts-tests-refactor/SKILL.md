---
name: ts-tests-refactor
description: "Refactoring and cleanup of whole TypeScript/JavaScript test suites, module by module, with a persisted plan, a safety net (tests + StrykerJS before and after) and one commit per module. Use whenever the user asks to clean up, organize, slim down, reduce, reorganize or refactor the tests of a project, package or monorepo, complains about too many tests, AI-generated tests, a slow or bloated suite, or asks to 'go over' the tests, even without saying 'module' or 'refactor'. To create or review tests for one specific unit, use ts-tests directly; this skill applies it as the criterion inside each module."
argument-hint: "Path to the repo or package, and optionally the module to start with"
---

# TypeScript test-suite refactoring, module by module

A bloated suite can't be cleaned in one pass: the diff becomes unreviewable and the agent deletes what mattered along with what was surplus. This skill splits the work into modules, closes each one with a safety net and its own commit, and keeps progress in a file so another session can resume. The criterion for what stays and what goes is not here: it comes from the `ts-tests` skill (triage, behavior → mutant → test plan, stopping rule, anti-catalog). Read its `SKILL.md` before touching the first module.

## Rules for the whole session

- **Never change production code.** If a test only becomes good by extracting a decision from glue or injecting a dependency, record it as a "production pending item" in the report and move on.
- **Never delete a test to make the suite pass.** A red baseline is diagnosed and reported; cleanup starts only with a green baseline or with the failure documented and isolated.
- **One module at a time, one commit per module.** Nothing from the next module goes into the current commit.
- **Stop after each module and show the report.** Continue to the next only when the user says so; if they authorize "all the way", continue alone but keep one commit per module and the plan file updated.
- Identify the runner (Vitest/Jest, ESM/CJS) and the Stryker setup from `ts-tests/references/`. In a monorepo, each package can differ.
- Never run the test runner in watch mode. Always `vitest run` / `jest --ci`.

## Phase 0 — Inventory and plan (once per repo)

1. Look for `tests-refactor-plan.md` at the repo root. If it exists, read it and jump to Phase 1 on the first `pending` module. If not, continue.
2. Run `python scripts/inventory.py <repo-root>` from this skill's folder. It lists each package, its runner, the count of `it`/`test` per folder, and the matching source folder (co-located `*.test.ts`, `__tests__/`, or a mirrored `tests/` tree). If the script doesn't fit the project layout, do the survey by hand with `grep -c` and record what you found.
3. Define the modules. A module is the smallest test folder that maps to one production concept (a feature, a domain, a bounded context, a package in a monorepo). A folder with more than ~40 tests or mixed concepts is split; one with fewer than 5 is grouped with its neighbor.
4. Estimate each module's criticality with the `ts-tests` triage table applied to what the production code does, not to what the tests say: payments, auth and persistence are Critical; route handlers, resolvers and middleware are Glue; types, DTOs and mappers are Trivial.
5. Order: first the most inflated **Glue** and **Trivial** modules (biggest win, lowest risk, and they calibrate what the user expects), then **Common**, last **Critical**, which need Stryker before and after.
6. Write `tests-refactor-plan.md` in the format of `references/plan-and-report.md`, show it to the user, and ask them to confirm the order before starting. A reordering requested by the user is recorded in the file, not just in the conversation.

## Phase 1 — One module

Repeat for the module marked `in progress` (mark it so before starting).

### 1. Baseline

- Run only the module's tests (`vitest run <folder>` / `jest <folder>`). Record total and result.
- If the module is Critical, run Stryker scoped to its source folder and record the score. Without a before-score there's no way to know whether the cleanup removed protection.
- Read every test file in the module and the source files they cover. Decide nothing from a test's title; read the body.

### 2. Classification and plan

For each source module covered, apply `ts-tests`:

- State the level (Critical, Common, Glue, Trivial).
- Build the behavior → mutant → test table with the tests **that should exist**.
- Compare with the ones that do. Each existing test gets one of four actions:
  - **Keep**: kills a plan mutant no other test kills.
  - **Merge**: two or more tests kill the same mutant; they become one, usually `it.each`.
  - **Rewrite**: covers a plan behavior but doesn't kill the mutant (it's in the anti-catalog: lone `toBeDefined`, `toHaveBeenCalled` without args, snapshot of computed data, test of the mock itself, etc.).
  - **Delete**: matches no plan row, or tests a Trivial unit, or is a unit test with module mocks on a Glue unit.
- A plan mutant with no existing test is **create**, but only if the module isn't Glue; in Glue, record the gap for an integration test instead of writing a unit test.

### 3. Execution

- Apply actions in the order delete → merge → rewrite → create, running the module's tests at the end of each batch.
- Reorganize to the target layout: the project's existing convention (co-located `*.test.ts` or `__tests__/`), one test file per source file, shared factories and fixtures where the project already keeps them (or `test/support/` if there's no convention). Moving a file is just moving; don't mix reorganization with rewriting in the same file without need.
- Standardize titles to read as sentences (`it('rejects a discount above 100%')`) and arrange/act/assert order per `ts-tests`. Renaming never justifies rewriting an assertion that already kills a mutant.
- Remove `it.skip`/`describe.skip` with no explanatory comment: either fix it or delete it, and say which.
- Delete orphaned snapshot files (`__snapshots__/`) whose tests were removed.

### 4. Verification

- Run the module's tests: they must pass.
- Run the related suite (other packages or folders that import the same source): it must pass.
- Run the type check the project uses for tests (`tsc --noEmit` with the test tsconfig) when the runner's transformer doesn't type-check.
- On a Critical module, run Stryker again on the same scope. Equal or higher score with fewer tests is success; a lower score means a deleted test killed an exclusive mutant. Restore it (or write the equivalent from the Stryker report) before closing the module.

### 5. Closing

- Write the module report in the format of `references/plan-and-report.md` and paste it into `tests-refactor-plan.md` under the module, marking it `done`.
- Make one commit with only the module's changes and the plan file. Message: `test(<module>): clean up and reorganize tests (<before> → <after>, Stryker <x>% → <y>%)`. Without Stryker, omit that part.
- Show the report to the user in short prose: before/after, what was deleted and why, production pending items. Ask whether to continue to the next module.

## When to stop or ask

- Red baseline that isn't environment drift: stop, show it, don't clean.
- A module still over ~60 tests after splitting: propose a further split before starting.
- A test you don't understand the purpose of (vague title, obscure assertion, covers behavior that doesn't appear in the source): keep it, mark `[?]` in the report, and ask. Deleting out of incomprehension is the most common way to lose protection.
- No Stryker installed in a Critical module: install it (`npm i -D @stryker-mutator/core` + the runner plugin); if you can't, say the module will be closed without a mutation safety net and ask for confirmation.

## Completion criteria (per module)

- Baseline recorded before any change (tests and, if Critical, Stryker).
- Every source module in the test module has a stated level and a plan table in the report.
- Every deletion and merge names the test that made it redundant in the report.
- No production code changed; production pending items are listed.
- Module tests, related suite and type check pass; on Critical, the Stryker score did not drop.
- Single commit for the module made and `tests-refactor-plan.md` updated.
