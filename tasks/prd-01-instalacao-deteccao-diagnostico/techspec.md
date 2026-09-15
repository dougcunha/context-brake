# Technical Specification

## Summary

This feature establishes the ContextBrake package, CLI composition root, core installation model, safe file-change engine, and eight harness adapters required by [the installation PRD](./prd.md). The design follows the repository's hexagonal architecture: pure core services derive detections, support profiles, installation/removal plans, and diagnostic findings; infrastructure adapters translate those plans to vendor-specific files and processes; CLI commands parse input, request confirmation, apply a previously computed plan, and render one canonical report as either text or JSON.

Installation is durable after a transient `npx context-brake init` invocation. Build-time generated, self-contained runtime assets are copied into harness-native project directories and registered there; installed hooks never depend on a global ContextBrake binary, a network request, or the original `npx` cache. Every mutation is represented first as a hash-preconditioned `ChangePlan`, preserves bytes outside ContextBrake-owned spans, resolves symlinks before writing, and is applied with same-directory temporary files plus atomic rename. Machine-only detections are reported as candidates and require explicit `--harness`; only project evidence is activated automatically. Plan and checkpoint files are local state: `init` lists their configured paths in the project `.gitignore` inside a ContextBrake-owned block (RF24), and `remove` takes that block out only together with the state files.

## System Architecture

### Component Overview

The implementation introduces the following components. Names are logical modules; large responsibilities must be split further to preserve the 100-line file and 30-line function limits.

| Layer | Component and planned location | Responsibility |
| --- | --- | --- |
| Package | `package.json`, `tsconfig.json`, lint/build/test configuration, `package-lock.json` | Define Node.js 20+ ESM packaging, the `context-brake` executable, standalone runtime-asset builds, and required quality commands. The implementing task must add those commands to `AGENTS.md`. |
| Core contract | `src/core/contracts/harness.ts` | Define harness IDs, evidence, detection state, version state, capabilities, support levels, integration state, and the adapter port. |
| Core contract | `src/core/contracts/changes.ts` | Define file snapshots, owned regions, file identities, planned changes, precondition hashes, conflicts, and the change-applier port. |
| Core contract | `src/core/contracts/configuration.ts` | Define the normalized project configuration and configuration-store port. |
| Core contract | `src/core/contracts/diagnostics.ts` | Define findings, severities, benchmark results, doctor reports, and the overhead-measurer port. |
| Core contract | `src/core/contracts/processes.ts` | Define executable discovery and timeout-bounded process execution without shell command construction. |
| Core service | `src/core/services/detection-service.ts` | Merge project evidence, machine evidence, version probes, explicit inclusions, and exclusions into active harnesses and candidates. |
| Core service | `src/core/services/support-service.ts` | Apply version-gated capability profiles and derive `full`, `partial`, or `cooperative` support with explicit missing-capability impacts. |
| Core service | `src/core/services/installation-service.ts` | Orchestrate config validation, detection, adapter plans, protocol generation, instruction edits, runtime assets, and the installation manifest into one deterministic plan. |
| Core service | `src/core/services/removal-service.ts` | Plan removal of exact registered entries and unchanged owned assets while preserving modified or unowned content. |
| Core service | `src/core/services/instruction-service.ts` | Upsert the three-line reference block, detect malformed/current/legacy markers, deduplicate physical files, and plan confirmed legacy migration. |
| Core service | `src/core/services/gitignore-service.ts`, `src/core/services/gitignore-markers.ts` | Render the `.gitignore` block for the configured plan and checkpoint paths, plan its creation, update, or removal, and refuse duplicated, unbalanced, or out-of-order markers (RF24, DEC-02). |
| Core service | `src/core/services/gitignore-checks.ts` | Report a missing, outdated, or malformed `.gitignore` block as doctor findings (RF21, RF24). |
| Core service | `src/core/services/protocol-service.ts` | Render the protocol from the same normalized zone and state-file configuration consumed by PRD 02 and PRD 03 services. |
| Core service | `src/core/services/doctor-service.ts` | Aggregate configuration, integration, marker, protocol, state-file, version, capability, and overhead findings into a severity-ordered report. |
| Core service | `src/core/services/report-service.ts` | Produce canonical command result models used by both text and JSON renderers, preventing output drift. |
| Infrastructure | `src/infrastructure/storage/node-file-system.ts` | Implement asynchronous snapshotting, `lstat`/`realpath` identity, repository-boundary checks, temporary-file writes, fsync where supported, and atomic rename. |
| Infrastructure | `src/infrastructure/storage/json-document-editor.ts` | Parse JSON/JSONC with duplicate-key detection and compute token-span edits that preserve unrelated bytes, comments, order, indentation, line endings, and final newline. |
| Infrastructure | `src/infrastructure/storage/project-config-store.ts` | Parse and validate `context-brake.config.json`, create defaults, and load the installation manifest. |
| Infrastructure | `src/infrastructure/process/node-process-runner.ts` | Discover executables, run version probes with argument arrays and timeouts, and kill timed-out process trees. |
| Infrastructure | `src/infrastructure/diagnostics/overhead-measurer.ts` | Run synthetic, side-effect-free fixtures through the installed runtime path and calculate nearest-rank p95. |
| Infrastructure | `src/infrastructure/harnesses/registry.ts` | Construct the eight adapters from immutable descriptors; it is the only infrastructure module imported by the CLI composition root. |
| Infrastructure | `src/infrastructure/harnesses/<harness>/` | Keep each vendor's detector, schemas, registration planner, doctor probes, fixture metadata, and runtime bridge isolated from core and other harnesses. |
| CLI | `src/cli/main.ts`, `src/cli/argument-parser.ts` | Dispatch `init`, `doctor`, and `remove` using `node:util.parseArgs`, validate option conflicts, and map interrupts or usage failures to exit codes. |
| CLI | `src/cli/composition-root.ts` | Inject core ports with Node and harness implementations without creating reverse dependencies. |
| CLI | `src/cli/commands/{init,doctor,remove}.ts` | Execute command workflows, including TTY-aware confirmation, without containing domain rules. |
| CLI | `src/cli/output/{text,json}.ts`, `src/cli/exit-codes.ts` | Render English, accessible status output; keep JSON stdout singular; map highest finding severity to stable exit codes. |
| Published assets | `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json`, `schemas/install-report.schema.json` | Publish Draft 2020-12 schemas generated from the canonical Zod schemas and verify generated files in CI. |
| Published assets | `assets/runtime/` | Hold build-generated, self-contained process hooks and in-process plugins copied by `init`; assets include no install-time network dependency. |
| Tests | `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/` | Verify pure policy, real byte-preserving edits, all vendor contracts, built CLI behavior, cross-platform operation, and at least 80% Vitest coverage. |

The eight adapter directories are `claude-code`, `codex-cli`, `cursor`, `github-copilot-cli`, `opencode`, `pi`, `oh-my-pi`, and `antigravity-cli`. Each directory owns vendor event names, payload schemas, configuration paths, command syntax, version-output parsing, minimum capability versions, and expected runtime asset. Shared behavior is expressed only through core contracts.

The principal data flow is:

1. The CLI resolves the project root to the explicit command working directory and validates an existing ContextBrake configuration before any other write-capable action.
2. Adapters collect project evidence and machine evidence independently. Version probes run only for executable candidates and receive a short timeout.
3. `DetectionService` automatically activates strong project detections, lists machine-only detections as candidates, adds explicit `--harness` selections, and removes explicit exclusions. Supplying the same ID to include and exclude is a usage error.
4. `InstallationService` asks adapters and the instruction, protocol, and `.gitignore` services for changes, combines changes by physical file identity, and returns an immutable `ChangePlan`. Invalid vendor files become per-harness conflicts and do not suppress safe plans for other harnesses.
5. Dry-run renders that exact plan. A real run confirms it, then the applier rechecks every precondition hash and atomically applies each independent file change. A concurrent change rejects that file rather than overwriting it.
6. `doctor` reads the same descriptors and schemas, never repairs state, and emits one `DoctorReport`; text and JSON are projections of that report.

## Implementation Design

### Main Interfaces

The core ports expose normalized values only. Vendor payloads and configuration shapes do not cross the adapter boundary.

```text
HarnessAdapter
  detect(context) -> Promise<HarnessEvidence[]>
  probeVersion(context) -> Promise<VersionProbe>
  planInstall(context) -> Promise<AdapterPlan>
  planRemove(context) -> Promise<AdapterPlan>
  diagnose(context) -> Promise<DiagnosticFinding[]>
  benchmarkFixture() -> BenchmarkFixture
```

```text
ChangePlanner
  snapshot(paths) -> Promise<FileSnapshot[]>
  merge(changes, snapshots) -> ChangePlan

ChangeApplier
  apply(plan) -> Promise<ApplyReport>
```

```text
InstructionService
  inspect(targets) -> Promise<InstructionInspection[]>
  planReference(input) -> PlannedChange[]
  planLegacyMigration(input) -> PlannedChange[]
  planRemoval(input) -> PlannedChange[]
```

```text
DoctorService
  diagnose(input) -> Promise<DoctorReport>

OverheadMeasurer
  measure(fixture) -> Promise<OverheadMeasurement>
```

The public command surface is fixed for this feature:

| Command | Options | Rules |
| --- | --- | --- |
| `context-brake init` | `--dry-run`, `--yes`, `--json`, repeatable `--harness <id>`, repeatable `--exclude-harness <id>`, repeatable `--instruction-file <path>`, `--create-instructions`, `--migrate-legacy` | Dry-run never confirms or writes. `--yes` authorizes the displayed ordinary plan, not legacy migration. Missing instruction files are created only with `--create-instructions`. A missing `.gitignore` is created with the state-file block (RF24). |
| `context-brake doctor` | `--json`, repeatable `--harness <id>` | Read-only and non-interactive. Explicit harnesses include machine-only candidates in the expected-integration checks. Overhead is measured for configured integrations as required by RF22. |
| `context-brake remove` | `--dry-run`, `--yes`, `--json`, `--remove-state` | Default removal retains plan/checkpoint and their `.gitignore` block. `--remove-state` is the separate explicit decision required by RF19 and also removes that block, deleting `.gitignore` when nothing else remains; in an interactive TTY it is also shown in the confirmation plan, and in non-TTY use it requires `--yes`. |

Repeated values preserve user order for diagnostics and are deduplicated before planning. Unknown harness IDs, out-of-root instruction paths, or the same ID in include/exclude produce `INVALID_ARGUMENTS` before filesystem mutation.

### Data Models

#### `ContextBrakeConfig` - normalized project configuration

The source JSON uses camelCase and `schemaVersion: 1`. All paths are repository-relative POSIX-style strings in the document and are converted with `node:path` only at the filesystem boundary. Unknown top-level or nested fields are rejected for the ContextBrake-owned configuration; harness-owned documents remain forward-compatible.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `$schema` | `string` | no | Editor hint pointing to the major-version schema published with the npm package. |
| `schemaVersion` | `1` | yes | Configuration contract version. |
| `activeHarnesses` | `HarnessId[]` | yes | Installed project integrations. Machine-only candidates are never added implicitly. |
| `telemetry` | `TelemetryConfig` | yes | Shared defaults consumed by protocol generation and the later runtime feature. |
| `stateStorage` | `StateStorageConfig` | yes | Plan/checkpoint paths and boot constraints from PRD 03. |
| `instructionFiles` | `InstructionFilesConfig` | yes | Existing targets and protocol destination. |

```text
{
  "$schema": "https://unpkg.com/context-brake@1/schemas/context-brake.config.schema.json",
  "schemaVersion": 1,
  "activeHarnesses": ["claude-code"],
  "telemetry": {
    "injectionMode": "threshold_only",
    "activationThresholdPercentage": 50,
    "contextWindowCeiling": 128000,
    "turnCeiling": 12,
    "zones": {
      "greenMaxPercentage": 49,
      "yellowMaxPercentage": 65,
      "criticalPercentage": 75,
      "greenMaxTurn": 7,
      "yellowMaxTurn": 10,
      "criticalTurn": 12
    }
  },
  "stateStorage": {
    "planFile": "task_plan.json",
    "checkpointFile": "state_checkpoint.json",
    "instructCheckpointCommit": true,
    "bootMaxTokens": 1000
  },
  "instructionFiles": {
    "targets": ["CLAUDE.md", "AGENTS.md"],
    "protocolFile": "docs/context-brake-protocol.md"
  }
}
```

Validation derives the red band as values above `yellowMaxPercentage` and turns above `yellowMaxTurn`; critical begins inclusively at its configured threshold. The schema and cross-field refinements reject non-increasing limits, values outside `0..100`, non-positive token/turn values, duplicate harnesses or paths, absolute paths, and any normalized path that escapes the project root. Defaults match RF15 and the related PRDs; `greenMaxPercentage: 49` expresses the PRD's “below 50%” boundary without two contradictory representations.

#### `HarnessDetection` - consolidated harness evidence

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `harness` | `HarnessId` | yes | Stable kebab-case ID. |
| `state` | `project | candidate | excluded` | yes | Project detections auto-activate; candidates require explicit selection. |
| `evidence` | `DetectionEvidence[]` | yes | Every independent signal with origin and path/executable. |
| `selectedExplicitly` | `boolean` | yes | Whether `--harness` promoted this harness. |
| `version` | `string | null` | yes | Normalized semantic version when a trustworthy probe succeeds. |
| `versionSource` | `executable | config | null` | yes | Provenance for the normalized version. |

```text
{
  "harness": "cursor",
  "state": "candidate",
  "evidence": [
    {"origin": "machine", "kind": "executable", "value": "agent"}
  ],
  "selectedExplicitly": false,
  "version": "1.7.2",
  "versionSource": "executable"
}
```

> **Degradation:** An installed executable with unrecognized or timed-out version output remains a candidate with `version: null` and produces a warning. Generic executable names such as Cursor's `agent` count only after the version banner matches the adapter schema.

#### `CapabilityProfile` - version-gated support statement

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `harness` | `HarnessId` | yes | Harness being described. |
| `supportLevel` | `full | partial | cooperative` | yes | Derived, never supplied by CLI presentation code. |
| `minimumVersion` | `string | null` | yes | Earliest verified version for the registered mechanisms. |
| `capabilities` | `CapabilityState[]` | yes | State and evidence for block, tool coverage (added by PRD 1.1), telemetry, boot, context usage, and failure behavior. |
| `limitations` | `CapabilityLimitation[]` | yes | Missing/indirect capabilities and user-visible impact. |

```text
{
  "harness": "github-copilot-cli",
  "supportLevel": "full",
  "minimumVersion": null,
  "capabilities": [
    {"id": "pre_tool_block", "state": "supported"},
    {"id": "timeout_fail_closed", "state": "unsupported"}
  ],
  "limitations": [
    {"capability": "timeout_fail_closed", "impact": "A timed-out hook lets the tool call continue."}
  ]
}
```

Exact numeric minimums must come from a vendor release note or a fixture verified against a released binary before that adapter is marked supported. Current vendor pages often document the capability without its introduction version; the specification therefore forbids invented version floors. With an unknown floor, `doctor` reports `VERSION_FLOOR_UNVERIFIED` and does not claim version compatibility, while the generic comparison path remains covered by injected version fixtures for CA-16.

#### `FileChange` - one preconditioned filesystem mutation

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | yes | Display path relative to project root. |
| `realPath` | `string` | yes | Canonical target used for deduplication and writing. |
| `kind` | `create | update | delete` | yes | Planned operation. |
| `owner` | `config | protocol | instruction_block | ignore_block | harness_entry | runtime_asset | manifest` | yes | Ownership category. `ignore_block` was added for RF24 (DEC-02). |
| `beforeSha256` | `string | null` | yes | Optimistic concurrency precondition; `null` requires absence. |
| `afterSha256` | `string | null` | yes | Expected resulting content; `null` means deletion. |
| `preview` | `ChangePreview` | yes | Human/JSON-safe created/deleted range or unified snippet. |

```text
{
  "path": "CLAUDE.md",
  "realPath": "D:/work/repo/CLAUDE.md",
  "kind": "update",
  "owner": "instruction_block",
  "beforeSha256": "0c8f...b761",
  "afterSha256": "c61b...9c02",
  "preview": {"summary": "Add ContextBrake reference block", "startLine": 42}
}
```

#### `ChangePlan` - complete preview and application input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Plan contract version. |
| `projectRoot` | `string` | yes | Absolute canonical root. |
| `changes` | `FileChange[]` | yes | Stable path-sorted changes. |
| `conflicts` | `PlanConflict[]` | yes | Invalid, ambiguous, out-of-root, or concurrently changed files not eligible for writing. A planned change whose canonical target has no matching snapshot is a `SNAPSHOT_MISSING` conflict, never a silent skip. |
| `harnesses` | `HarnessInstallPlan[]` | yes | Per-harness intended outcome and support profile. |
| `requiresConfirmation` | `boolean` | yes | False only for an empty/no-op plan. |

```text
{
  "schemaVersion": 1,
  "projectRoot": "D:/work/repo",
  "changes": [],
  "conflicts": [
    {"path": ".claude/settings.json", "code": "INVALID_HARNESS_CONFIG", "detail": "Unexpected token at line 4, column 2"}
  ],
  "harnesses": [
    {"harness": "claude-code", "outcome": "skipped", "supportLevel": "full"}
  ],
  "requiresConfirmation": false
}
```

`init --dry-run` renders this object directly. A real installation applies the same object; it does not re-plan after confirmation. Each file is atomic, but the whole multi-file plan is not presented as a transaction. If one application fails, remaining independent files continue and the final report is an error with the partial outcomes, so `doctor` can give deterministic remediation.

#### `InstallationManifest` - ownership and safe-removal state

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Manifest version. |
| `packageVersion` | `string` | yes | ContextBrake version that produced the assets. |
| `assets` | `ManagedAsset[]` | yes | Relative paths, ownership types, and installed hashes. |
| `entries` | `ManagedEntry[]` | yes | Vendor file, event/JSON path, and exact stable entry identity. |

```text
{
  "schemaVersion": 1,
  "packageVersion": "1.0.0",
  "assets": [
    {"path": ".claude/hooks/context-brake.mjs", "kind": "runtime_asset", "sha256": "aa12...90bf"}
  ],
  "entries": [
    {"harness": "claude-code", "path": ".claude/settings.json", "identity": "PreToolUse|*|.claude/hooks/context-brake.mjs"}
  ]
}
```

The manifest is stored at `.context-brake/manifest.json` and contains no user content, prompts, tool outputs, credentials, or full before-images. Removal deletes an owned asset only when its current hash matches the manifest. Modified assets are left in place with an error unless an explicitly designed future force workflow is added; this PRD does not add a destructive force flag.

#### `IgnoreBlock` - git-ignored local state (RF24)

`init` keeps one ContextBrake-owned block in the project-root `.gitignore`. With the default configuration it is:

```text
# CONTEXTBRAKE:START
/task_plan.json
/state_checkpoint.json
# CONTEXTBRAKE:END
```

| Rule | Behavior |
| --- | --- |
| Paths | One line each for `stateStorage.planFile` and `stateStorage.checkpointFile`, in that order, anchored to the root with a leading `/`. Characters with gitignore meaning (`*`, `?`, `[`, `!`, `#`, and a trailing space) are escaped with a backslash; configuration validation already rejects backslashes, absolute paths, and paths that escape the root. |
| Missing file | Created with LF line endings and only the block. |
| File without the block | The block is appended at the end, preserving the file's line-ending style and final-newline state, as for instruction blocks. |
| File with the block | The block is replaced in place when its lines differ from the configuration and left untouched otherwise, so repeated runs are no-ops. |
| Malformed markers | Duplicated, unbalanced, or out-of-order markers produce the `DUPLICATE_GITIGNORE_MARKERS` or `MALFORMED_GITIGNORE_MARKERS` conflict; the file stays byte-identical and the other changes proceed. |
| Symbolic link | Written through the resolved target, like every other planned change. |
| Removal | Only `remove --remove-state` removes the block; when the remaining content is empty or blank, `.gitignore` is deleted. |
| Ownership | `FileChange.owner` is `ignore_block`. Like instruction blocks, the block is not recorded in the manifest. |
| Doctor | With a valid configuration, a missing block or one that lists other paths yields `STATE_FILES_NOT_IGNORED` (warning); malformed markers yield `MALFORMED_GITIGNORE_MARKERS` (error). |

#### `InstallReport` - canonical init/remove result

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Published report version. |
| `command` | `init | remove` | yes | Command discriminator. |
| `mode` | `dry_run | applied` | yes | Whether the plan was previewed or applied. |
| `status` | `success | warnings | errors` | yes | Highest finding/application severity. |
| `exitCode` | `0 | 1 | 2` | yes | Stable result code. |
| `detections` | `HarnessDetection[]` | yes | Project detections and machine-only candidates. |
| `plan` | `ChangePlan` | yes | The exact previewed or applied plan. |
| `outcomes` | `ApplyOutcome[]` | yes | Per-change `planned`, `applied`, `unchanged`, `skipped`, or `failed` state. |
| `findings` | `DiagnosticFinding[]` | yes | Warnings/errors in the same form used by doctor. |

```text
{
  "schemaVersion": 1,
  "command": "init",
  "mode": "dry_run",
  "status": "success",
  "exitCode": 0,
  "detections": [],
  "plan": {"schemaVersion": 1, "projectRoot": "D:/work/repo", "changes": [], "conflicts": [], "harnesses": [], "requiresConfirmation": false},
  "outcomes": [],
  "findings": []
}
```

#### `DiagnosticFinding` - canonical doctor observation

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable uppercase machine code. |
| `severity` | `ok | warning | error` | yes | Determines label and exit-code precedence. |
| `scope` | `project | harness | file | performance` | yes | Finding category. |
| `harness` | `HarnessId | null` | yes | Related harness, if any. |
| `path` | `string | null` | yes | Related project-relative file, if any. |
| `message` | `string` | yes | English result statement. |
| `impact` | `string | null` | yes | Missing-capability or failure impact. |
| `remediation` | `string | null` | yes | Concrete corrective action. |

```text
{
  "code": "INTEGRATION_MISSING",
  "severity": "error",
  "scope": "harness",
  "harness": "claude-code",
  "path": ".claude/settings.json",
  "message": "The Claude Code integration is missing.",
  "impact": "ContextBrake cannot stop or annotate tool calls in this harness.",
  "remediation": "Run context-brake init --harness claude-code --yes."
}
```

#### `OverheadMeasurement` - side-effect-free benchmark result

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `harness` | `HarnessId` | yes | Installed integration measured. |
| `executionModel` | `process | in_process` | yes | Chooses target and sampling method. |
| `sampleCount` | `number` | yes | Successful measured samples. |
| `p95Milliseconds` | `number | null` | yes | Nearest-rank p95, or null when unavailable. |
| `targetMilliseconds` | `100 | 15` | yes | PRD 02 target. |
| `status` | `pass | fail | unavailable` | yes | Comparison outcome. |

```text
{
  "harness": "claude-code",
  "executionModel": "process",
  "sampleCount": 20,
  "p95Milliseconds": 43.7,
  "targetMilliseconds": 100,
  "status": "pass"
}
```

Process adapters use three warm-ups plus twenty fresh Node process samples, including startup and fixture parsing. In-process adapters use ten warm-ups plus one hundred isolated handler calls after module import, excluding host startup. p95 uses the element at `ceil(0.95 * n)` in a copied, ascending sample list. A timeout, malformed output, or insufficient samples yields `unavailable`, never a fabricated zero.

#### `DoctorReport` - text/JSON source of truth

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Published report version. |
| `command` | `doctor` | yes | Report discriminator. |
| `status` | `healthy | warnings | errors` | yes | Highest finding severity. |
| `exitCode` | `0 | 1 | 2` | yes | Stable health result. |
| `detections` | `HarnessDetection[]` | yes | Project and machine candidate inventory. |
| `integrations` | `HarnessDiagnostic[]` | yes | Install state, version, support, limitations, and overhead. |
| `findings` | `DiagnosticFinding[]` | yes | Canonically sorted detailed observations. |

```text
{
  "schemaVersion": 1,
  "command": "doctor",
  "status": "warnings",
  "exitCode": 1,
  "detections": [],
  "integrations": [],
  "findings": [
    {"code": "NO_PROJECT_HARNESS", "severity": "warning", "scope": "project", "harness": null, "path": null, "message": "No project harness was detected.", "impact": null, "remediation": "Select one with --harness <id>."}
  ]
}
```

Text output groups the same findings but does not use table alignment to carry meaning. JSON uses explicit `null` for unavailable optional source data so consumers can distinguish unavailable from omitted.

#### `CliErrorDocument` - non-health JSON error envelope

| Code | Exit | Meaning |
| --- | --- | --- |
| `INVALID_ARGUMENTS` | `64` | Unknown option, missing value, or the same harness included and excluded. |
| `INVALID_CONTEXTBRAKE_CONFIG` | `2` | Configuration failed syntax, schema, or cross-field validation. |
| `CONFIRMATION_REQUIRED` | `2` | A non-TTY write command lacked `--yes`. |
| `INTERRUPTED` | `130` | SIGINT interrupted the command; temporary files were cleaned where possible. |
| `UNEXPECTED_ERROR` | `2` | Unexpected failure; human mode may include a stack only in verbose diagnostics. |

`doctor` does not use this envelope for an invalid project configuration. It emits a schema-valid `DoctorReport` with an error finding and continues checks that do not require normalized configuration. `init` and `remove` use the envelope and stop before planning writes.

```text
{
  "schemaVersion": 1,
  "command": "init",
  "status": "error",
  "exitCode": 64,
  "error": {
    "code": "INVALID_ARGUMENTS",
    "message": "Harness 'cursor' cannot be both included and excluded."
  }
}
```

### API Endpoints (if applicable)

Not applicable. ContextBrake is a local CLI and harness integration package. It exposes no HTTP server, consumes no remote API, and requires no authentication. JSON command output and local JSON files are documented under Data Models instead of as network endpoints.

## Integration Points

All integrations are local and project-scoped. The adapter descriptor records strong project evidence separately from machine evidence. A user-level configuration or executable is reported as `candidate`; it is never written and never activates project installation without `--harness`.

| Harness | Strong project evidence | Registration and owned runtime asset | Capability decision |
| --- | --- | --- | --- |
| Claude Code | `.claude/settings.json`, `.claude/settings.local.json`, `.claude/`, or `CLAUDE.md`; never `AGENTS.md` alone | Surgically add exact handlers to `.claude/settings.json`; copy `.claude/hooks/context-brake.mjs`. Use `PreToolUse`, `PostToolUse`, and `SessionStart`. | Full when the verified version supports all three registered events. The hook catches internal errors and emits explicit deny at the critical ceiling; undeliberate hook failures remain a documented risk. A hook timeout or failure without explicit deny releases the call and is reported as a limitation (PRD 1.1 FR-03). |
| Codex CLI | `.codex/hooks.json` or `.codex/config.toml`; never `AGENTS.md` alone | Prefer surgical entries in `.codex/hooks.json`; copy `.codex/hooks/context-brake.mjs` and register both `command` (POSIX `sh -lc`) and `commandWindows` (`cmd.exe /C`) variants (`DEC-04`). If inline TOML hooks already exist, preserve them and report `MIXED_HOOK_REPRESENTATIONS` because current Codex loads both with a warning. | Partial because hosted tools bypass local tool hooks and project hooks require trust review. Doctor reports disabled hooks, unverified trust, and non-git project roots (`DEC-04`) as limitations/warnings when observable. |
| Cursor | `.cursor/hooks.json`, `.cursor/cli.json`, or `.cursor/` | Surgically update `.cursor/hooks.json`; copy `.cursor/hooks/context-brake.mjs`; set `failClosed: true` on blocking handlers. | Full only for versions/CLI surfaces verified to run `preToolUse`, `postToolUse`, and `sessionStart`; fire-and-forget session start and CLI coverage remain version-gated. |
| GitHub Copilot CLI | `.github/copilot/settings.json`, `.github/copilot/settings.local.json`, `.github/hooks/*.json`, or `copilot-instructions.md` | Create the dedicated `.github/hooks/context-brake.json` plus `.github/hooks/context-brake.mjs`, using `exec` and `args` where supported to avoid shell interpolation. | Full since PRD 1.1: the documented explicit deny covers every tool call. Command-hook timeouts fail open and are reported as a limitation, while non-timeout `preToolUse` failures fail closed. |
| OpenCode | `opencode.json`, `opencode.jsonc`, or `.opencode/` | Copy self-contained `.opencode/plugins/context-brake.js`; do not add dependencies or trigger Bun installation. | Partial: `tool.execute.before` blocking is documented; model-visible post-tool context and stable boot injection must stay unsupported until a versioned integration fixture proves them. |
| Pi | `.pi/settings.json` or `.pi/extensions/` | Copy self-contained `.pi/extensions/context-brake.js`, which registers `tool_call`, `tool_result`, and session/before-agent handlers. | Full after a versioned fixture confirms loading, context usage, blocking, result preservation, and boot. |
| Oh-My-Pi | `.omp/config.yml`, `.omp/settings.json`, or `.omp/extensions/` | Copy self-contained `.omp/extensions/context-brake.js`, using the current extension API rather than legacy `hooks/pre` and `hooks/post`. | Full after a versioned fixture confirms the native extension path and failure-closed `tool_call`; known vendor regressions are handled by version gates. |
| Antigravity CLI | `.agents/hooks.json` with Antigravity's named-hook structure or an Antigravity project file; the `.agents/` directory alone is not evidence | Surgically add the named `context-brake` entry to `.agents/hooks.json`; copy `.agents/hooks/context-brake.mjs`; register `PreInvocation` only (`DEC-03`). | Partial because `PreToolUse` registration is deferred to PRD-02 to prevent blanket auto-approval (`DEC-03`), `PostToolUse` accepts only `{}`, and boot/telemetry are indirect through injected invocation steps; failure/timeout guarantees remain unknown. |

Machine executable descriptors are `claude`, `codex`, `agent`/`cursor-agent`, `copilot`, `opencode`, `pi`, `omp`, and `agy`. Each probe uses `--version`, accepts only adapter-specific output, has a two-second timeout, and never invokes authentication or network-required subcommands. A user configuration path is also machine evidence. Multiple executable aliases collapse to one harness detection.

Vendor contracts must be rechecked when implementing each adapter and reflected in `docs/research/harness-integrations.md` in the same implementation change. Sources reconfirmed for this design include [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Cursor hooks](https://cursor.com/docs/hooks), [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference), [OpenCode plugins](https://opencode.ai/docs/plugins/), [Pi extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md), [Oh-My-Pi extension loading](https://github.com/can1357/oh-my-pi/blob/main/docs/extension-loading.md), and [Antigravity hooks](https://antigravity.google/docs/hooks/). The current Copilot documentation is more precise than the frozen research: non-timeout command `preToolUse` failures deny, but timeouts still allow the call.

The only runtime dependencies planned for the CLI are Zod 4, `jsonc-parser`, and `semver`:

- Zod is mandatory for external data and can generate the shipped JSON Schemas from the input contract through `z.toJSONSchema`.
- `jsonc-parser` supplies scanner/AST offsets for narrow edits; ContextBrake must not delegate insertion blindly to `modify`, because its current inline-comment behavior can re-associate a user's comment. Fixture tests cover this case.
- `semver` normalizes vendor version banners and handles prerelease ordering; adapters retain the original version string for reporting.

`node:util.parseArgs`, `node:fs/promises`, `node:path`, `node:os`, `node:crypto`, `node:child_process`, and `node:perf_hooks` cover CLI parsing, storage, hashing, process execution, and timing. No CLI framework, general filesystem wrapper, Git library, HTTP client, tokenizer, database, or telemetry service is justified for this feature.

## Testing Approach

Vitest runs unit, integration, and end-to-end suites with global thresholds of at least 80% for lines, statements, functions, and branches. Every production module must be exercised by automated tests; thresholds are a floor, not a substitute for behavior assertions. Tests use injected clocks/processes, fixture version output, temporary repositories, and no network or installed harness. Test names cite the stable IDs below and the PRD's `CA-*` identifiers (the Portuguese PRD uses `CA`, so this document does not rename them to `AC`).

### Unit Tests (if applicable)

| ID | Test case name | Acceptance criteria | Expected result |
| --- | --- | --- | --- |
| UT-01 | Shared instructions are not harness evidence | CA-03 | `AGENTS.md` alone yields no project detection or active integration. |
| UT-02 | Explicit selection and exclusion override detection | CA-04 | Inclusion promotes a candidate, exclusion removes a project detection, and a conflicting pair is rejected. |
| UT-03 | Machine-only evidence stays a candidate | CA-03 | A valid executable signal is reported with origin `machine` but is absent from the installation set without `--harness`. |
| UT-04 | Repeated adapter merge is idempotent | CA-05 | Three plans preserve user entries and contain one ContextBrake entry. |
| UT-05 | Invalid vendor document becomes an isolated conflict | CA-06 | The original bytes produce no planned edit while other adapter plans remain available. |
| UT-06 | Physical instruction identities deduplicate | CA-07 | Two logical paths resolving to one identity produce one edit. |
| UT-07 | Reference block respects the context budget | CA-08 | The canonical block has three lines including markers and points to the configured protocol. |
| UT-08 | Missing instruction targets do not create by default | CA-09 | No change is planned unless `--create-instructions` explicitly authorizes a target. |
| UT-09 | Legacy migration requires a dedicated decision | CA-10 | Without `--migrate-legacy`, the file is unchanged and a preview finding is emitted; confirmed migration preserves unmatched text outside the new block. |
| UT-10 | Dry-run and apply share one change plan | CA-11 | Both render/apply the same change IDs and hashes; dry-run calls no write port. |
| UT-11 | Removal targets exact owned content | CA-12 | Exact entries and unchanged assets are removed; plan/checkpoint and modified assets remain. |
| UT-12 | Cross-field zone validation reports the source value | CA-13 | A yellow limit below green returns field, received value, and violated increasing-order rule. |
| UT-13 | Missing integration is an error finding | CA-14 | Expected-but-absent entry produces `INTEGRATION_MISSING` and report exit code 2. |
| UT-14 | Copilot timeout limitation is reported without lowering support | CA-15 | Support is `full`, and a limitation says a timeout releases the tool call (PRD 1.1 FR-02 and FR-03). |
| UT-15 | Version gates identify an old harness | CA-16 | Injected old/current versions report detected version, minimum, and affected capability. |
| UT-16 | Text and JSON use one finding model | CA-17 | Both projections contain identical codes, severities, harnesses, impacts, and remediation. |
| UT-17 | Nearest-rank overhead p95 is deterministic | CA-18 | Sorted synthetic samples select `ceil(0.95*n)` and compare against 100 ms or 15 ms. |
| UT-18 | Support levels are exhaustive | CA-01, CA-15 | Every capability combination maps to one literal support level; no unknown capability is treated as supported. |
| UT-19 | JSONC token-span edits preserve trivia | CA-05, CA-06 | Key order, comments including trailing inline comments, CRLF/LF, indentation, and final newline remain byte-identical outside the owned edit. |
| UT-20 | Exit severity is stable | CA-03, CA-14, CA-17 | Healthy is 0, any warning without error is 1, and any error is 2 regardless of finding order. |
| UT-21 | `.gitignore` block renders configured, escaped state paths | CA-21 | Default and custom paths, including `#`, `!`, `*`, and a trailing space, render the exact block with root-anchored, escaped lines. |
| UT-22 | `.gitignore` planning is idempotent and preserves user bytes | CA-21 | Absent file, file without the block, file with the current block, file with an outdated block, CRLF, and no-final-newline fixtures plan create, append, no-op, and in-place update; bytes outside the block are unchanged. |
| UT-23 | Malformed `.gitignore` markers become conflicts | CA-06, CA-21 | Duplicated, unbalanced, and out-of-order markers yield their conflict code and no planned change. |
| UT-24 | Removal keeps the block unless state removal is confirmed | CA-12 | Default removal plans no `.gitignore` change; `--remove-state` removes the block and deletes a file left empty. |
| UT-25 | Doctor reports unignored state files | RF21, RF24 | Missing and outdated blocks produce `STATE_FILES_NOT_IGNORED`; malformed markers produce `MALFORMED_GITIGNORE_MARKERS`; a current block produces no finding. |

Unit tests use fakes only at core ports. Parser/schema tests may exercise concrete pure infrastructure helpers without filesystem access.

### Integration Tests (if applicable)

| ID | Test case name | Acceptance criteria | Expected result |
| --- | --- | --- | --- |
| IT-01 | Claude project installation preserves settings | CA-01, CA-05 | Real fixture bytes retain user hooks and receive one ContextBrake integration plus config. |
| IT-02 | Codex and Cursor install together | CA-02 | Both project signals produce independent valid registrations and appear in the report. |
| IT-03 | Explicit Copilot exclusion leaves only Cursor | CA-04 | Copilot files are untouched and Cursor is installed. |
| IT-04 | Malformed harness config does not block peers | CA-06 | Invalid file hash is unchanged, its error includes location, and a valid second harness is installed. |
| IT-05 | Symlink and junction target is written once | CA-07, CA-20 | The real instruction file has one block and the logical link remains a link; unsupported local link creation is skipped with a reason. |
| IT-06 | Existing-only instruction policy | CA-08, CA-09 | Existing targets get the short block and absent targets remain absent. |
| IT-07 | Legacy preview and migration preserve user text | CA-10 | Preview writes nothing; confirmed migration retains non-protocol content byte-for-byte outside owned markers. |
| IT-08 | Filesystem dry-run is side-effect free | CA-11 | Recursive before/after snapshots are identical while all intended changes are reported. |
| IT-09 | Safe removal preserves unrelated content and applies state consent | CA-12 | Default removal keeps plan/checkpoint; `--remove-state --yes` removes them; user settings and unrelated bytes remain in both paths. |
| IT-10 | Invalid ContextBrake config blocks writes and remains diagnosable | CA-13 | `init`/`remove` return error 2 before writes; `doctor` returns a report error with JSON pointer/value/rule; the repository snapshot is unchanged. |
| IT-11 | Doctor detects manual integration removal | CA-14 | Active harness is `missing`, finding is error, exit is 2. |
| IT-12 | Copilot adapter reports documented failure policy | CA-15 | Dedicated hook file is valid and doctor emits the timeout limitation. |
| IT-13 | Version process probe is bounded and normalized | CA-16 | Old, prerelease, malformed, and timed-out fixture executables yield the specified states without shell use. |
| IT-14 | Doctor benchmark exercises installed assets | CA-18 | Process and in-process fixtures return sample count, p95, target, and pass/fail without changing project files. |
| IT-15 | Atomic writer rejects a concurrent edit | CA-05, CA-11 | A changed precondition hash leaves the user's newer bytes intact and reports `FILE_CHANGED_SINCE_PREVIEW`. |
| IT-16 | All eight detection descriptors avoid cross-signals | CA-02, CA-03 | Each fixture detects exactly its intended harness; `.agents/` and `AGENTS.md` generic fixtures produce no Antigravity/Codex activation. |
| IT-17 | `.gitignore` survives three installations | CA-21 | A fixture with user patterns and comments ends with one block and identical user bytes after three `init` runs; a repository without `.gitignore` gets a file containing only the block; a symlinked `.gitignore` stays a link. |
| IT-18 | State files are ignored by git | CA-12, CA-21 | In a temporary git repository, plan and checkpoint files created after `init` are absent from `git status --porcelain`; after default `remove` they are still ignored; after `remove --remove-state --yes` the files and the block are gone. Skipped with the reason when `git` is unavailable. |

Integration fixtures live under `tests/fixtures/harnesses/<harness>/` and include valid empty config, existing user integrations, current ContextBrake entry, invalid syntax, duplicate keys, old/new version output, and vendor payload examples. Instruction fixtures cover LF, CRLF, no final newline, symlink, junction, dangling/out-of-root link, current markers, corrupted markers, and legacy markers.

### End-to-End Tests (if applicable)

| ID | Test case name | Acceptance criteria | Expected result |
| --- | --- | --- | --- |
| E2E-01 | Built CLI installs Claude non-interactively | CA-01 | `context-brake init --yes` creates valid config/assets and prints Claude plus support level. |
| E2E-02 | Built CLI installs two detected harnesses | CA-02 | Codex and Cursor are both configured in one run. |
| E2E-03 | No project harness exits with warning | CA-03 | No integration is written, candidate/selection guidance is printed, and exit code is 1. |
| E2E-04 | Three consecutive installations are byte-idempotent | CA-05 | Run-two and run-three repository snapshots are identical to run-one with one integration/block. |
| E2E-05 | Invalid adapter input yields partial installation | CA-06 | Stderr names the invalid path/problem, safe harness changes complete, and exit code is 2. |
| E2E-06 | Dry-run then confirmed run match | CA-11 | Dry-run changes nothing; the confirmed run applies exactly the reported path/action set. |
| E2E-07 | Remove uninstalls owned integration only by default | CA-12 | Doctor changes from installed to absent while user content and state files remain; a second fixture verifies explicit `--remove-state`. |
| E2E-08 | Doctor JSON validates against published schema | CA-14, CA-15, CA-16, CA-17, CA-18 | Stdout is one JSON document with text-equivalent findings, version limitation, and overhead result. |
| E2E-09 | Quick-start workflow meets user-time target | CA-19 | Scripted `init --yes` plus `doctor --json` completes well below two minutes; core work excluding benchmark is separately asserted below five seconds. |
| E2E-10 | Cross-platform critical scenarios | CA-20 | CA-01, CA-05, and CA-07 fixture workflows pass on Linux, macOS, and Windows; Windows enables symlink privilege and both PowerShell/Git Bash launch coverage. Verified on Ubuntu, macOS, and Windows × Node 20/22/24 by GitHub Actions run 34881898428 on `1d4bbb5`; the `DEC-01` waiver is superseded. |
| E2E-11 | Built CLI ignores state files idempotently | CA-11, CA-21 | `init --dry-run` lists the `.gitignore` change without writing; `init --yes` run three times on a fixture with a user `.gitignore` leaves one block and unchanged user lines. |

There is no browser or visual test layer. E2E tests spawn the built CLI with argument arrays in isolated temporary directories and assert stdout, stderr, exit code, file identity, exact bytes, and cleanup.

## Development Sequencing

### Build Order

1. Create the npm/TypeScript/Vitest/ESLint build skeleton, stable exit codes, schema-generation check, and standalone asset build. This establishes all commands and immediately updates the `AGENTS.md` Commands section as required.
2. Implement closed-set core types, Zod configuration/report schemas, defaults, version comparison, support derivation, and unit tests. Later layers depend on these contracts.
3. Implement file identity, JSONC token-span editing, instruction/legacy planning, manifest ownership, and atomic application with exhaustive byte-preservation fixtures. This is the highest-risk shared infrastructure.
4. Implement detection and explicit-selection policy, then the adapter registry. Machine-only candidate behavior and false-positive protection are complete before any adapter can write.
5. Implement adapters in two groups: dedicated/config JSON process hooks (Claude, Codex, Cursor, Copilot, Antigravity), then in-process plugins/extensions (OpenCode, Pi, Oh-My-Pi). Each adapter change rechecks and updates its research section and ships fixtures in the same task.
6. Implement installation and removal orchestration around the immutable plan, followed by `init`/`remove` command parsing, confirmation, text output, and JSON output.
7. Implement read-only doctor aggregation, runtime self-tests, overhead measurement, support limitations, output schema, and severity exit mapping.
8. Complete built-CLI E2E coverage, package-content checks, `npm pack` smoke tests, and Linux/macOS/Windows CI. Run lint, typecheck, tests, and coverage before declaring the feature complete. GitHub Actions run 34881898428 on `1d4bbb5` provides the completion evidence on Ubuntu, macOS, and Windows × Node 20/22/24; the `DEC-01` waiver is superseded.

9. RF24 follow-up (2026-09-14), delivered by PRD 1.1 FR-01: add the `ignore_block` owner and regenerate `schemas/install-report.schema.json`; implement the `.gitignore` service, markers, and doctor check; snapshot `.gitignore` and wire it into installation, removal, and doctor; then run UT-21 to UT-25, IT-17, IT-18, and E2E-11 on the CI matrix. This step extends the accepted scope with RF24 and CA-21 and does not reopen CA-01 to CA-20.

Each sequence item should be decomposed by `sdd-create-tasks`; this document does not implement or mark those tasks complete.

### Technical Dependencies

- Node.js 20+ and npm are required. npm package contents must include CLI output, schemas, protocol source, and all standalone runtime assets.
- Runtime libraries: Zod 4, `jsonc-parser`, and `semver`, pinned by `package-lock.json` and verified to have no install scripts in their dependency closure.
- Development tooling: TypeScript, ESLint, Vitest with V8 coverage, and a deterministic esbuild-based bundling step for standalone assets. Exact versions are pinned when the package skeleton is created.
- Vendor binaries, credentials, and network access are not test dependencies. Git is used only by IT-18, which is skipped with the reason when `git` is unavailable. Git is optional at runtime for this PRD, with the exception of the Codex CLI integration hooks which require installation at a git repository root (`DEC-04`); no-git repositories use the command working directory as root and still support install/doctor/remove.
- A harness adapter cannot move from experimental/unsupported capability state to advertised support until its current official documentation, minimum-version evidence, runtime fixture, and `docs/research/harness-integrations.md` agree.
- OpenCode post-result visibility, Cursor CLI event coverage, Codex failure/trust observability, and Antigravity failure behavior are research gates, not assumptions that may be reported as guarantees.

## Monitoring and Observability

ContextBrake sends no telemetry and opens no network connection. Observability is local and metadata-only:

- Human command results use stdout; warnings, errors, and progress use stderr. JSON mode writes exactly one schema-valid document to stdout.
- Optional local logs are emitted only through the logging adapter and contain timestamp, command, harness, finding code, duration, and file path relative to the project. They never contain prompts, model output, tool output, credentials, environment values, or full user-file content.
- `doctor` is the health surface. It reports configuration validity, active/candidate detections, integration state, version compatibility, support/limitations, marker and protocol integrity, optional plan/checkpoint validity, and overhead p95.
- Timings use a monotonic clock. Core `init` and `doctor` work is measured separately from confirmation and the explicit benchmark phase so the five-second requirement and PRD 02 hook targets are not conflated.
- Expected user-fixable failures are findings with stable codes, not stack traces. Unexpected failures retain their cause chain for verbose local diagnostics.

## Technical Considerations

### Key Decisions

- **Machine-only signals are candidates:** per the product-owner clarification, executables and user-level config never trigger project writes. Explicit `--harness` promotes them; strong project evidence auto-activates them.
- **`--harness` adds and `--exclude-harness` removes:** both override detection. Contradictory flags for one harness are rejected rather than applying a hidden precedence rule.
- **Durable local runtime assets:** `init` copies versioned standalone assets and registers those files. This works after `npx` exits and avoids global installs, package-manager mutations in user projects, runtime downloads, and hook-time `npx` startup.
- **One canonical camelCase config:** `schemaVersion: 1` replaces the frozen SRS's mixed semantic/schema version and snake_case draft. Protocol thresholds are rendered from this parsed object to keep RF9 of PRD 02 coherent.
- **Surgical editing, not parse/stringify:** harness JSON/JSONC uses an AST/token-span editor. Invalid syntax, duplicate touched keys, ambiguous owned entries, or parser edge cases cause a no-write conflict for that file.
- **Per-file atomicity with optimistic concurrency:** plan hashes prevent overwriting changes made after preview. Cross-file rollback is rejected because it can overwrite new user work; partial outcomes are explicit and diagnosable.
- **Legacy migration has its own consent:** `--yes` approves ordinary planned writes but does not imply `CONTEXTOPS` migration. Interactive confirmation or `--migrate-legacy` is required; unmatched legacy content is moved outside managed markers unchanged.
- **Removal is conservative:** exact registered entries and unchanged manifest-owned assets, including generated config/protocol/runtime files, are removable. Modified assets remain with an error. Plan/checkpoint are retained unless `--remove-state` explicitly selects them; `--yes` alone never selects state deletion.
- **Current config is authoritative:** an existing valid ContextBrake config is loaded and preserved. An invalid one stops `init` and `remove` before writes; read-only `doctor` converts it to `INVALID_CONTEXTBRAKE_CONFIG` in `DoctorReport` and continues every diagnostic that can run without normalized configuration. An existing unmanaged protocol with different content is a conflict, not overwritten.
- **Stable health exits:** `0` means healthy/success, `1` warning/partial support, `2` error/partial command failure, `64` invalid CLI usage, and `130` interrupt. The highest severity wins.
- **Honest version compatibility:** numeric floors are stored only with release or binary-fixture evidence. Missing evidence yields a warning and never a false “supported version” claim.
- **Benchmark the integration, not the vendor UI:** synthetic fixtures exercise the exact installed asset path without launching an authenticated harness or performing tool side effects. This keeps doctor local, deterministic, and automatable.
- **Prefer built-ins over frameworks:** `node:util.parseArgs` is stable in Node 20 and is sufficient for three commands; Zod, JSONC parsing, and semantic versions are retained because reimplementing them would add material correctness risk.
- **DEC-01 — macOS acceptance evidence waiver for PRD-01 (HIL decision, 2026-09-14; superseded the same day; PRD CA-20, E2E-10):**
  - **Current status, superseded:** the repository was published to GitHub, and Actions run [34881898428](https://github.com/dougcunha/context-brake/actions/runs/34881898428) on revision `1d4bbb5` passed the full `.github/workflows/ci.yml` matrix, Ubuntu, macOS, and Windows × Node 20, 22, and 24, including E2E-10 CA-01, CA-05, and CA-07. CA-20 is verified without a waiver.
  - **What the first macOS run exposed:** `tests/integration/change-applier.test.ts` built planned paths under the non-canonical temporary directory (`/var` is a symlink to `/private/var`), and `createChangePlan` silently dropped the deletion. The test now uses the canonical directory, and a planned change without a matching snapshot is a conflict rather than a silent skip.
  - **Historical waiver:** the product owner had no macOS machine and no Linux environment other than WSL 2. CA-20 and E2E-10 were accepted with evidence from Ubuntu on WSL 2 and from Windows (PowerShell and Git Bash), each on Node 20, 22, and 24, from revision `58082e5`, recorded as equivalent runs in the T16 handoff. macOS had no acceptance evidence, and a review was to treat the missing macOS slice as covered by the waiver. A GitHub-hosted macOS runner and a physical or cloud Mac were then unavailable.

- **DEC-02 — Local state is git-ignored through an owned `.gitignore` block (HIL decision, 2026-09-14; PRD RF24, RF19, RF21, CA-12, CA-21):**
  - Plan and checkpoint files belong to the machine that runs the task and are never committed. `init` owns a block between `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END` in the project-root `.gitignore`, rendered from the configured paths. `remove` takes it out only with `--remove-state`, so kept state files never reappear as untracked.
  - The block follows the instruction-block rules: planned before writing, byte-preserving, idempotent, refused on malformed markers, and written through symbolic links (`file-changes.md`). A new `ignore_block` owner keeps previews and reports truthful. The owner enum grows inside `InstallReport` schema version 1, which is acceptable because no release has been tagged yet.
  - Rejected: `.git/info/exclude`, because it is not shared with collaborators and does not exist without git; a nested `.gitignore` next to the state files, because they live at the repository root by default; and no block at all, because agents would commit local state and the PRD-03 clean-tree check would flag every checkpoint update.
  - Absorbed preparation: `installation-service.ts` is at 92 lines and gains the `.gitignore` plan, so the conflict-to-finding mapping moves to a helper in the same task and the file stays within 100 lines.

- **DEC-03 — Antigravity registers only PreInvocation and rejects blanket tool auto-approval (HIL decision, 2026-09-14; PRD-01 CR-02, PRD-02 RF09):**
  - Antigravity CLI uses a named-hook root structure (`{"context-brake": {"PreInvocation": [...]}}`) rather than a top-level `hooks` object. ContextBrake registers only `PreInvocation` in PRD-01 and answers with `{"injectSteps": []}`, which safely maintains telemetry readiness without modifying tool decisions.
  - Antigravity's documented `PreToolUse` decision enum lacks a pass-through or deferral verdict (`allow`, `deny`, `ask`, `force_ask`, `deny_unless_prior_grant`). Emitting `decision: "allow"` unconditionally auto-approves all tool executions, bypassing safety mechanisms. Registering `PreToolUse` is deferred to PRD-02, where selective blocking decisions (`deny`) will be computed dynamically against telemetry thresholds.
  - Legacy `hooks.PreToolUse.context-brake` and `hooks.PreInvocation.context-brake` registrations are cleaned on install and remove, pruning the legacy `hooks` wrapper key only when all remaining values are empty objects.

- **DEC-04 — Codex CLI hook command variants and git root dependency (HIL decision, 2026-09-14; CR-07):**
  - Codex CLI executes hook commands from the session working directory, resolving the project root as the nearest ancestor containing `.git`. On Windows, Codex invokes `%COMSPEC% /C` (`cmd.exe`), where the POSIX `$(git rev-parse --show-toplevel)` subshell does not expand.
  - ContextBrake registers both `command` (POSIX `sh -lc` form: `node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" <Event>`) and `commandWindows` (`cmd.exe /C` form: `for /f "delims=" %i in ('git rev-parse --show-toplevel') do @node "%i/.codex/hooks/context-brake.mjs" <Event>`). The `@node` prefix suppresses command echoing in `cmd.exe`, ensuring clean empty stdout.
  - Codex CLI integration requires the ContextBrake project root to be the git repository root. `doctor` emits the warning finding `CODEX_ROOT_NOT_GIT_TOPLEVEL` when an installed Codex CLI integration resides in a project root lacking a `.git` entry (file or directory).
  - Scope is strictly confined to Codex CLI hooks; `init`, `doctor`, and `remove` continue to function without git for all other harnesses.

Rejected alternatives include rewriting entire vendor JSON documents, editing existing Codex TOML through serialization, depending on globally installed `context-brake`, running `npx` from each hook, adding ContextBrake to an arbitrary project's dependencies, treating `AGENTS.md`/`.agents/` as harness proof, silently migrating legacy blocks, or reporting undocumented capabilities as working.

### Known Risks

- Vendor hook contracts are moving targets. Mitigation: isolate schemas per adapter, parse vendor payloads non-strictly, gate capabilities by verified versions, keep fixtures beside adapters, and update research with each adapter change.
- Some official pages document capabilities but not introduction versions. Mitigation: keep minimum version nullable, warn, and require release/binary evidence before compatibility claims.
- Codex may have inline TOML hooks already; creating `hooks.json` is non-destructive but produces a vendor warning about mixed representations. Mitigation: report it explicitly and do not rewrite TOML until a byte-preserving TOML editing strategy is separately specified.
- Codex project hooks require hash-based trust review. Mitigation: installation output and doctor remediation instruct the user to review `/hooks`; lack of a stable non-interactive trust query remains a limitation.
- Cursor `sessionStart` is documented as fire-and-forget, and CLI event coverage may vary. Mitigation: a versioned E2E fixture must prove boot delivery before full support is advertised.
- OpenCode post-tool mutations may not become model-visible. Mitigation: retain partial support and mark post-tool telemetry unsupported until an integration fixture proves otherwise.
- Claude Code and Copilot hook timeouts fail open. Mitigation: keep the runtime well below the deadline and report the limitation; since PRD 1.1, support levels depend on the honored explicit deny, so both stay `full`.
- Pi and Oh-My-Pi extensions execute in-process with full permissions. Mitigation: self-contained async handlers, no synchronous I/O, no background raw timers, bounded work, and exhaustive failure fixtures.
- Antigravity uses `.agents/hooks.json`, which shares a directory name with common agent rules. Mitigation: only an exact schema-recognized hooks file is evidence, and the adapter edits only its named `context-brake` object.
- Atomic rename semantics and symlink privileges differ on Windows. Mitigation: resolve and validate targets, write beside the target, test PowerShell/Git Bash, enable CI symlink privilege, and skip local symlink tests only with an explicit reason.
- `jsonc-parser` has known comment/edit edge cases. Mitigation: use its scanner/AST offsets rather than blind `modify`, and lock regression fixtures for inline comments, array removal, duplicate keys, and line endings.
- Runtime bundling can duplicate shared code across in-process adapters. This is accepted to guarantee standalone durability; package-content and overhead tests constrain size/startup instead of introducing runtime dependency resolution.
- macOS path semantics differ from Linux and Windows: the default temporary directory sits under `/var`, a symlink to `/private/var`, and the filesystem is usually case-insensitive. The first macOS CI run exposed a test that planned non-canonical paths, which `createChangePlan` silently dropped. Mitigation: `macos-latest` runs in the CI matrix; a planned change without a matching canonical snapshot becomes a `SNAPSHOT_MISSING` conflict; tests that plan paths use canonical temporary directories.
- A state file committed before RF24 stays tracked, because `.gitignore` does not untrack files. Mitigation: the README tells users to run `git rm --cached <file>` for state files already in the repository; doctor does not run git for this check.
- A user pattern placed after the block, such as `!task_plan.json`, re-includes a state file. Mitigation: `init` appends the block at the end of the file, and later user negations are the user's decision and stay untouched.

### RF24 Update: Quality Profile and Terrain Baseline

Rules the RF24 follow-up can violate, verified on the TypeScript files in its task diff (`files`) and the subset under `src/core/` (`core_files`). A blocking hit prevents task completion; a reservation is an optional improvement.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' "${files[@]}"` | — |
| QA-06 | 4+ parameters in one declaration, or a `.ts` file above 100 lines | reservation | `rg -n --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"; rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | `DEC-02` (absorbed split of `installation-service.ts`) |

In the table, `\|` stands for a literal pipe. Escalation trigger: eight or more reservation hits, a touched file above 200 lines, or the same block duplicated in three or more places; the `.gitignore` marker handling must reuse the instruction-marker helpers rather than add a third copy.

Terrain baseline measured on 2026-09-14 at `99643a5`. No target has a declaration with 4+ parameters, a `case` statement, or a pre-existing QA hit.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/changes.ts` | 33 | 24 | ≤ 3 | 0 | structural: 24 exported members | recorded (one enum value added, no new export) |
| `src/core/contracts/diagnostics.ts` | 37 | 11 | ≤ 3 | 0 | structural: 11 exported members | recorded (one enum value added, no new export) |
| `src/core/services/installation-service.ts` | 92 | 3 | ≤ 3 | 0 | — | absorbed in `DEC-02` |
| `src/core/services/removal-service.ts` | 85 | 3 | ≤ 3 | 0 | — | recorded |
| `src/core/services/removal-helper.ts` | 54 | 3 | ≤ 3 | 0 | — | recorded |
| `src/core/services/doctor-service.ts` | 86 | 2 | ≤ 3 | 0 | — | recorded |
| `src/cli/snapshot-helper.ts` | 33 | 1 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/doctor.ts` | 52 | 1 | ≤ 3 | 0 | — | recorded |
| `tests/unit/removal-service.test.ts` | 58 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/diagnostics.test.ts` | 14 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/schemas.test.ts` | 16 | 0 | ≤ 3 | 0 | — | recorded |

- Preparatory refactoring: not recommended. `changes.ts` and `diagnostics.ts` cross the export threshold, but the change adds one enum value and no export; the only file with intense contact, `installation-service.ts`, is healthy and its split is absorbed in `DEC-02`.

### Compliance With AGENTS.md and Rules

`AGENTS.md` and every rule in `.agents/rules/` were read in full before drafting: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, and `cli-output.md`.

- The design is hexagonal: `src/core/` imports neither infrastructure nor CLI; vendor formats remain in adapter directories; the CLI wires ports through dependency injection; module flow is acyclic.
- Planned files and responsibilities are narrow enough to enforce 100-line TypeScript files, 30-line functions, at most three parameters, guard clauses, named constants, strict ESM TypeScript, no `any`, exhaustive literal unions, immutability, and only essential comments.
- Every external value enters as `unknown` and passes a Zod schema. Vendor object schemas remain non-strict to tolerate added fields; ContextBrake-owned schemas are strict and versioned.
- All I/O is asynchronous. Process execution uses executable plus argument arrays, timeouts, process-tree termination, and no user-derived shell strings. In-process extensions contain no synchronous I/O or long computations.
- Hook stdout is reserved for the exact vendor response. Logs and diagnostics use stderr or the local logging adapter and never contain sensitive/user content.
- Every user-file change is planned before writing, is previewed from the same plan, preserves unowned bytes, refuses invalid files, resolves links, stays inside the repository, writes atomically, and is idempotent.
- CLI output is English and accessible, uses textual `OK`/`WARN`/`ERROR` labels, respects `NO_COLOR` and non-TTY streams, keeps JSON stdout singular, and never prompts without a TTY or `--yes` equivalent.
- Tests use the unit/integration/E2E pyramid, temporary fixture repositories, no network/machine dependence, explicit CA/test IDs, meaningful assertions, and a failing 80% minimum coverage threshold. No browser, server, port, visual, or responsive testing is included.
- Harness implementation tasks must recheck official documentation and update `docs/research/harness-integrations.md` when it differs. The Copilot failure-policy wording is already identified as needing that implementation-time update.

### Skill Compliance

- `sdd-create-techspec` applies and was followed: the target PRD and dependent requirements were analyzed; an Explore agent inspected the specification-stage repository, all project rules, integration research, dependent PRDs, and external documentation; the unresolved machine-only detection rule was clarified with the product owner; this document follows the supplied template, specifies components/contracts/tests without implementation, and links every test layer to `CA-*` criteria.
- No other project skill under `.agents/skills/` applies to this deliverable. PRD creation, task decomposition, task execution, review, and QA remain later workflows. There are no deviations from the applicable project skill.

### Relevant and Dependent Files

- `AGENTS.md`
- `.agents/rules/code-standards.md`
- `.agents/rules/javascript-typescript.md`
- `.agents/rules/node.md`
- `.agents/rules/tests.md`
- `.agents/rules/harness-adapters.md`
- `.agents/rules/file-changes.md`
- `.agents/rules/cli-output.md`
- `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md`
- `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
- `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
- `docs/context-brake-protocol.md`
- `docs/research/README.md`
- `docs/research/harness-integrations.md`
- `docs/research/contextops-srs-original.md`
- `docs/research/contextops-spec-review.md`
- `README.md`
- `.agents/skills/sdd-create-techspec/references/TEMPLATE.md`
- RF24 follow-up (2026-09-14), modify: `src/core/contracts/changes.ts`, `src/core/contracts/diagnostics.ts`, `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `src/core/services/removal-helper.ts`, `src/core/services/doctor-service.ts`, `src/cli/snapshot-helper.ts`, `src/cli/commands/doctor.ts`, `schemas/install-report.schema.json`, `README.md`
- RF24 follow-up (2026-09-14), create: `src/core/services/gitignore-service.ts`, `src/core/services/gitignore-markers.ts`, `src/core/services/gitignore-checks.ts`, and their unit, integration, and end-to-end tests

No source, package, test, or generated-schema file exists yet; every implementation path named in this specification is new.
