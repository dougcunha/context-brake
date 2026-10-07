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

Prioritize the highest product risk. Zone classification, the zone actions and snapshot settings, the failure policy, and changes to harness configuration files need success, failure, boundary, and recovery scenarios. The human-readable `doctor` formatting needs less depth. Never write tests only to raise the percentage.

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
3. **End-to-end (`tests/e2e/`):** a smoke set only: one built-CLI test per command (`init`, `doctor`, `remove`) and one built hook round trip per process harness, against fixture repositories in temporary directories. Every other behavior is tested in process.
4. **Benchmarks (`tests/bench/`):** latency and timing-target suites, run by `npm run test:bench` and `release:check`, never by `npm test`.

Keep the pyramid: many unit tests, fewer integration tests, and few end-to-end tests. This project has no web interface, browser, or Playwright.

## Time Budget and Processes

- `npm test` and `npm run coverage` must each finish within 120 s of wall time on the development machine; the target is 60 s. `npm run test:budget` times `npm test`, lists the ten slowest files, and fails above 120 s. Run it after adding or moving tests.
- Test in process by default: commands through `tests/helpers/in-process-cli.ts` (`runInProcessCli`) or `delegated-world.ts` (`runCli`), hooks through `tests/helpers/in-process-hook.ts` (`runHookInProcess`), and `doctor` with the fake overhead measurer and the fake process runner (`tests/helpers/fake-process-runner.ts`) those helpers inject. A test that calls `runInit`, `runRemove`, `runDoctor`, or `dispatchCommand` directly passes `overheadMeasurer: fakeOverheadMeasurer` and `runner: fakeProcessRunner` itself, so it starts no `git` or version-probe process.
- A test may start a child process only when the behavior depends on one: shell quoting, signal or timeout handling, the hook process boundary (stdin, stdout, exit code), concurrency between hook processes, packaging, or the e2e smoke set. List such a file in `PROCESS_LANE_FILES` in `tests/test-lanes.ts`; the lane test fails otherwise.
- Latency benchmarks and timing targets go to `tests/bench/`. Never raise a test timeout or add a retry to hide a slow or flaky test; fix its cause.

## Required Scenarios

- **User file changes:** run each change against fixture copies and assert that content ContextBrake does not own stays byte-for-byte identical, including after a second run.
- **Zone boundaries:** cover every usage and turn boundary defined in the telemetry PRD.
- **Failure policy:** cover adapter failures in every zone; each one lets the tool call proceed.
- **Agent-facing text:** assert the exact telemetry block and resume text, plus the 60-token budget of the telemetry block.

## Harness Fixtures

Payload and configuration fixtures live in `tests/fixtures/harnesses/<harness>/` and follow the formats in `docs/research/harness-integrations.md`.

## Platforms

The suite runs on Linux, macOS, and Windows. In CI, the Windows job must be allowed to create symbolic links. Locally, symlink tests check whether the system can create links; when it cannot, the test is skipped with the reason, never passed silently.
