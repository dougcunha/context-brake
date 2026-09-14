---
paths:
  - "src/**/*.ts"
  - "tests/**/*"
  - "vitest.config.*"
---

# Testing Rules

These rules apply to ContextBrake unit, integration, and end-to-end tests.

## Required Coverage

<critical>**All code must be covered by automated tests. This is a critical rule and must not be ignored.**</critical>

Minimum coverage is 80%, measured by Vitest, and the run fails below it. Coverage is not the goal by itself: tests verify behaviors and requirements with meaningful assertions.

Prioritize the highest product risk. Zone classification, blocking above the critical ceiling, plan and checkpoint validation, and changes to harness configuration and instruction files need success, failure, boundary, and recovery scenarios. The human-readable `doctor` formatting needs less depth. Never write tests only to raise the percentage.

## FIRST Principle

- **Fast:** prefer unit tests, using fakes of the ports in `src/core/contracts/` instead of the filesystem, processes, git, or network.
- **Independent:** each test prepares its own data; integration and end-to-end tests use their own temporary directory and remove it at the end.
- **Repeatable:** never depend on the clock, randomness, the network, the developer's machine, or installed harnesses. Use fake timers, inject harness versions and paths through fixtures, and restore mocks and timers after each test.
- **Self-validating:** assert the return value, the final state, and relevant side effects, such as the content written to a harness configuration file.

The Timely aspect of FIRST does not apply to this project.

## Test Structure

Use Given/When/Then or Arrange/Act/Assert. Each test checks one behavior, and its name states the condition and the expected result. When a test covers a PRD requirement or a TechSpec test case, cite the identifier in the test name or in `describe`, such as `FR-03` or `TC-12`.

```ts
it('classifies 75% usage as the critical ceiling (FR-03)', () => {
  const zone = classifyZone({ percentage: 75, turns: 3 }, defaultZones);
  expect(zone).toBe('CRITICAL');
});
```

## Layers

1. **Unit (`tests/unit/`):** `src/core/` entities and services, parsers, schemas, and zone classification, using port fakes.
2. **Integration (`tests/integration/`):** `src/infrastructure/` adapters against a real filesystem in a temporary directory, a temporary git repository, and harness fixtures.
3. **End-to-end (`tests/e2e/`):** the built CLI run as a child process against fixture repositories, covering the critical `init`, `doctor`, `remove`, `plan init`, and `plan status` flows.

Keep the pyramid: many unit tests, fewer integration tests, and few end-to-end tests. This project has no web interface, browser, or Playwright.

## Required Scenarios

- **User file changes:** run each change against fixture copies and assert that content ContextBrake does not own stays byte-for-byte identical, including after a second run.
- **Zone boundaries:** cover every usage and turn boundary defined in the telemetry PRD.
- **Failure policy:** cover adapter failures below and above the critical ceiling.
- **Agent-facing text:** assert the exact telemetry block, block message, and boot summary, plus their token budgets: 60 tokens for the telemetry block and 1,000 tokens for the boot summary of the reference fixtures.

## Harness Fixtures

Payload and configuration fixtures live in `tests/fixtures/harnesses/<harness>/` and follow the formats in `docs/research/harness-integrations.md`.

## Platforms

The suite runs on Linux, macOS, and Windows. In CI, the Windows job must be allowed to create symbolic links. Locally, symlink tests check whether the system can create links; when it cannot, the test is skipped with the reason, never passed silently.
