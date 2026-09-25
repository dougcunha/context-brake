# S1.11 — invalid turn pair (FR-02, TC-03)

Driver check S1.11 expected `doctor --json` to name the field and rule. Reproduction (temp repo, `greenMaxTurn: 30`, `yellowMaxTurn: 30`):

- `doctor --json`: exit 2, finding `INVALID_CONTEXTBRAKE_CONFIG`, message `Configuration validation failed.` (no field or rule).
- `init --yes`: exit 2, same generic message.
- Built hook `PreToolUse`: stderr `ContextBrake: INVALID_CONFIG`; `errors.jsonl` detail `InvalidConfigurationError telemetry.zones.greenMaxTurn` (field, no rule).
- Same generic `doctor` message for an invalid percentage pair (`greenMaxPercentage: 70`), i.e. pre-existing behavior for every config error, unchanged by this feature (`doctor-checks.ts:16` prints `error.message`, identical at base `3b94a9c`).

The schema rejects the pair with path `telemetry.zones.greenMaxTurn` and rule `must be less than yellowMaxTurn` (TC-03, `tests/unit/configuration.test.ts`), which is the verification route the approved TechSpec assigns. Classified as observation OBS-01, not a feature failure.
