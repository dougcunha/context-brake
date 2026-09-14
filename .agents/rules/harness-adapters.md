---
paths:
  - "src/infrastructure/harnesses/**/*"
  - "tests/fixtures/harnesses/**/*"
---

# Harness Adapters

A harness adapter translates between one harness and the ports in `src/core/contracts/`. These rules apply to adapter code and harness fixtures.

## Source of Truth

- Implement only behavior that the harness documentation confirms and that `docs/research/harness-integrations.md` records.
- When implementation or a new harness version shows different behavior, update the harness section, the adapter, and its fixtures in the same change.
- Treat undocumented behavior as unsupported. Never report a capability, such as a guaranteed block, that the documentation does not confirm.
- Gate each capability on the minimum harness version that documents it.

## Harness Input

- Parse every payload with the adapter's Zod schema, without `.strict()`. Vendors add fields between versions, so fail only when a field the adapter uses is missing or has the wrong type.
- Identify sessions by the harness's own session identifier, and keep per-session state outside the process, because process-based hooks start fresh on every event.

## Harness Output

- Emit only the fields documented for the event, following the stdout rule in `node.md`.
- When a harness can both add context and replace a tool result, add context and leave the original result intact.
- The telemetry block, block message, and boot summary are a versioned contract built in `core` and shared by all adapters. Adapters only transport that text.

## Failure Policy

- A hook never ends with an uncaught exception.
- Below the critical ceiling, an internal failure lets the tool call proceed.
- At or above the critical ceiling, an internal failure denies the call wherever the harness supports failing closed, while reading and writing the plan and checkpoint, the validation command, `git status`, `git add`, `git commit`, and the configured additional commands stay allowed.
- Keep each hook invocation within the overhead target of the telemetry PRD.
