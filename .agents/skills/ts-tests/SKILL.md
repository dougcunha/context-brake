---
name: ts-tests
description: "TypeScript tests with Vitest or Jest, calibrated by criticality, with an explicit rule for how many tests a unit deserves and when to stop. Use whenever you create, review, reduce or diagnose unit or integration tests in TypeScript or JavaScript, decide between unit and integration, hunt redundant tests or tests that pass without checking anything, clean inflated test files, choose between Vitest and Jest conventions, or run mutation testing with StrykerJS. Use it even when the request is just 'add tests for X': this skill decides how many. Do not use it to set up databases, containers or CI pipelines."
argument-hint: "Describe the TypeScript test to create, review, reduce or fix"
---

# TypeScript tests with Vitest / Jest

A test is only worth its cost if there is a plausible change to the implementation that turns it red. Everything in this skill follows from that: write the test that kills a mutant, don't write the one that kills none, and delete the one that only kills mutants another test already kills. The goal is a small suite nobody can fool, not a large suite that looks like it covers everything.

## 1. Triage

Classify the unit before writing the first line. The level sets the effort and the ceiling: heavy tests on trivial code are waste, light tests on critical code are risk.

| Level | The unit… | Test ceiling | Effort |
| --- | --- | --- | --- |
| **Critical** | touches money, tax, persistence, auth, permissions, concurrency, date arithmetic or timezones; has 3+ branches; or has already broken in production | no numeric ceiling, but every test justified by its own mutant | `it.each` on boundaries + error paths + Stryker scoped to it |
| **Common** | the rest of the business logic | **2** (happy path + the most likely error) | a third test only with a named mutant the first two don't kill |
| **Glue** | route handler, controller, resolver, middleware, repository, orchestration that only delegates | **0 unit tests** | covered by an integration test (section 2) |
| **Trivial** | type, interface, DTO, 1:1 mapper, re-export, config object, wrapper with no decision | **0** | none |

State the chosen level in one sentence in the reply, not as a code comment. If the unit mixes levels (a service with one critical rule and three delegating methods), classify per function.

## 2. Unit or integration

The rule: **logic gets unit tests; glue gets integration tests.** Never write both for the same thing.

- Has a decision of its own (calculation, validation, state machine, parsing, branching rule) → unit test, fast, no infrastructure, no module mocks.
- Only connects pieces (receives request, calls service, returns response; builds query and runs it; publishes event) → integration through the real edge (`supertest`/`fetch` against the app, real database via testcontainers or a test DB, `msw` for outbound HTTP). A unit test of glue with four `vi.mock` calls tests the mock wiring, not the system.
- If the unit is glue but holds a decision (an authorization `if` in the handler, a sort in the repository), extract the decision or unit-test only that; the rest stays integration.

Integration tests follow the ceiling and the plan below too. One per business flow, not one per endpoint.

## 3. Plan before code

Before writing any test, list a short table in the reply:

| Behavior | Mutant that would break it | Test |
| --- | --- | --- |
| Discount above 100% is rejected | `>` → `>=` in `percent > 100` | `rejects a discount above 100%` |

Plan rules:

- One row per **observable behavior**, not per function, branch or line. Two exported functions that produce the same observable effect share a row.
- The mutant column is mandatory. If you can't name the implementation change the test would catch, the behavior doesn't need a test.
- Two rows with the same mutant are one row. Merge them.
- No test is written outside the plan. If "just one more" is tempting mid-way, go back to the plan and justify the new row by its mutant.

The plan costs five lines of reply and is what stops a test file from growing by inertia.

## 4. Stopping rule

Stop when every plausible mutant from the catalog (section 5) for this unit has a test that kills it. After that, each extra test is cost with no return: slower runs, more maintenance per refactor, more noise in the diff.

A candidate test must answer one question: **which mutant does it kill that no existing test kills?** No answer, no test. This applies doubly to `it.each`: three values (one on each side of the boundary, one in the middle) kill the whole family of comparison mutants; the fourth onward only repeats.

When touching an existing test file, ask the same question of what's already there. A test that kills no exclusive mutant is deleted in the same change, with one sentence in the reply naming the test that made it redundant. AI-inflated suites are cleaned this way: one file at a time, whenever the file is touched for another reason.

## 5. The mutant

After writing each test, apply the mutant mentally: change the implementation plausibly and ask whether **this** test turns red. A surviving mutant is a missing case; a test that kills none is a test to delete.

Mutants that matter in TypeScript:

- Boundary: `>` ↔ `>=`, `<` ↔ `<=`
- Equality: `===` ↔ `!==`, `==` ↔ `===`
- Boolean: `&&` ↔ `||`, `if (x)` ↔ `if (!x)`, `?.` removed, `??` → `||`
- Return: `return value` → `return undefined`, `null`, `0`, `""`, `[]`
- Literal: `0` ↔ `1`, `""` ↔ `"x"`, `[]` ↔ `[item]`, `true` ↔ `false`
- Arithmetic: `+` ↔ `-`, `*` ↔ `/`
- Array method: `.filter(fn)` → `.filter(() => true)`, `.map` body → identity, `.sort` comparator → `() => 0`
- Removed call: delete the side-effect line (`save`, `publish`, `commit`, `await queue.add`)
- Async: `await` removed, `.catch` removed

`it.each` with values on both sides of each boundary kills the whole comparison family with one test; it is the cheapest technique per mutant killed.

## 6. Tests that kill no mutant

Each pattern below passes green against any implementation. Replace it with the form on the right, or delete it.

- `expect(x).toBeDefined()`, `toBeTruthy()` or `not.toThrow()` as the only assertion → assert the value the rule produces.
- `expect(mock).toHaveBeenCalled()` or `toHaveBeenCalledWith(expect.anything())` → assert the argument: `toHaveBeenCalledWith(expect.objectContaining({ total: EXPECTED_TOTAL }))`.
- Assertion that recomputes the implementation's formula → compare with an expected literal.
- `toMatchSnapshot()` / `toMatchInlineSnapshot()` on computed data → assert the fields the rule decides; snapshots pass any change once someone runs `-u`.
- `toHaveBeenCalled` as the main assertion when the contract is the return value → assert the return; verify interaction only when the side effect **is** the contract.
- Test that checks a `vi.fn().mockReturnValue(x)` returned `x` → delete; it tests the mocking library.
- Test of a type, interface, constant or re-export → delete; it is Trivial. Use `expectTypeOf`/`tsd` only for public library types that users depend on.
- `expect.assertions(n)` with nothing else meaningful → delete.

## 7. Test structure

- Test file sits next to the source as `<name>.test.ts` (or under `__tests__/`), following whatever the project already does. Never mix both conventions in one package.
- One `describe` per unit under test, named after the function or class; `it` reads as a sentence: `it('rejects a discount above 100%')`. Avoid `should`.
- Arrange, act, assert in that order, separated by a blank line. Comments only when the arrangement isn't obvious.
- Reuse the project's existing builders, factories and fixtures. Read the neighboring test files before creating your own.
- Extract reused strings and numbers into `UPPER_CASE` constants at the top of the file.
- Use template literals for multiline content; keep paths relative to the test file.
- Don't `beforeEach` what only one test needs.

## 8. Dependencies and isolation

- Test through the public API of the module (what it exports). A mutant surviving a test of an internal helper means observable behavior is uncovered.
- Prefer dependency injection (pass the collaborator as a parameter) over `vi.mock`/`jest.mock` of a module path. Module mocks are global, hoisted, and couple the test to the import graph; needing more than two of them is the signal the unit is Glue (section 2).
- Fake time with `vi.useFakeTimers()`/`vi.setSystemTime()` (or `jest.useFakeTimers()`), never by mocking `Date` manually. Always restore in `afterEach`.
- For outbound HTTP use `msw`; for databases use a real instance (testcontainers or a test DB), never a mocked query builder; a mocked `prisma`/`knex` produces tests that kill no SQL mutant.
- For logs, inject a no-op logger or assert on a captured array; don't `vi.spyOn(console, 'log')` unless the log **is** the contract.
- `vi.restoreAllMocks()` in `afterEach` (or `restoreMocks: true` in config) so one test's spy can't leak into another.

## 9. Runner, validation and Stryker

- Before touching a test project, identify the runner (Vitest or Jest, ESM or CJS) from `package.json` and config files, and read `references/runner.md`: mocking, timers and module semantics differ.
- Run the most specific test first (`vitest run path/to/file.test.ts -t "name"`), then the related set, then the package. Don't run the whole monorepo for a one-file change.
- On a **Critical** unit, run mutation testing scoped to it following `references/stryker.md`. A surviving mutant becomes a new plan row and a new test, never `// Stryker disable`.

## Completion criteria

- The criticality level is stated and the number of tests respects the level's ceiling.
- The unit-vs-integration decision followed the logic/glue rule, and no glue received unit tests with module mocks.
- The plan (behavior → mutant → test) appeared in the reply before the code, and no test written is outside it.
- Each test kills at least one mutant no other test in the file kills.
- Redundant pre-existing tests in the touched file were deleted, with the justification in the reply.
- No test matches a pattern in section 6.
- The runner was identified and the rules in `references/runner.md` were followed.
- On a critical unit, Stryker ran on its scope and every surviving mutant became a test or has a written justification.
- The specific test and the related suite pass, or the failure is documented with a known cause.
