# Architectural Analysis Report
**Date**: [timestamp]
**Repository / Packages**: [name — N packages]
**Node.js / TypeScript**: [versions]
**Files Analyzed**: X
**Dead Code Files**: Y
**Duplication Groups**: Z

---

## Executive Summary
- **Dead Code**: X files, Y exports completely unreferenced
- **Duplicated Functionality**: Z duplication groups
- **Architectural Anti-Patterns**: W issues
- **Type-Safety Issues**: V problematic usages
- **Code Smells**: U instances

**Estimated Cleanup**: Remove ~X lines of dead code, consolidate Y duplications

---

## Compiler Posture

| Configuration | `strict` | `noUncheckedIndexedAccess` | `skipLibCheck` |
|---------------|----------|----------------------------|----------------|
| `tsconfig.json` | true | *absent* | true |
| `packages/legacy/tsconfig.json` | *absent* | *absent* | true |

**Issue**: configurations without `strict` leave implicit `any` and unchecked nulls to runtime; every finding in Type-Safety Issues below is unverified by the compiler there.

---

## Dead Code

### Completely Dead Files (DELETE)
| File | Reason | Confidence |
|------|--------|------------|
| `src/infrastructure/storage/legacy-plan-reader.ts` | Imported nowhere; not an entry point | HIGH |
| `src/core/services/unused-formatter.ts` | Exported but never imported | HIGH |

**Total Lines**: X lines can be deleted

### Dead Exports (REMOVE)
| File | Export | Reason |
|------|--------|--------|
| `src/core/entities/zones.ts` | `legacyZoneLabel()` | Replaced by `zoneLabel()`, no references |
| `src/core/contracts/archiver.ts` | whole interface | No implementation, no consumer |

### Possibly Dead (VERIFY)
| File | Export | Reason | Verification Needed |
|------|--------|--------|---------------------|
| `src/infrastructure/harnesses/cursor/legacy-hook.ts` | `handleLegacyEvent()` | Referenced only by a string path in a fixture | Confirm no harness configuration still points to it |
| `src/cli/options.ts` | `verbose` | Read only through a computed key | Check the CLI option registration |

### Internal Dead Code
- `src/core/services/boot-summary.ts:48` — unexported function `trimLegacy()` never called
- `src/cli/commands/doctor.ts:77` — variable `lastProbe` assigned but never read
- `src/infrastructure/git/status.ts:31` — parameter `cwd` accepted but never used

---

## Duplicated Functionality

### CRITICAL: Exact Duplicates

#### Duplication Group 1: Marker block detection
**Instances**: 3
**Files**:
- `src/infrastructure/storage/instruction-file.ts:22` — `hasBlock(content)`
- `src/cli/commands/remove.ts:40` — `containsMarkers(text)`
- `src/cli/commands/doctor.ts:65` — `findBlock(text)`

**Analysis**: identical regular expression and trimming rules
**Lines Duplicated**: ~12 lines × 3 = 36 lines
**Recommendation**:
- Keep: `src/infrastructure/storage/instruction-file.ts:hasBlock()`
- Remove: the other two
- Update: all call sites to the kept version

### HIGH: Similar Logic

#### Duplication Group: JSON configuration editing
**Instances**: 2
**Files**:
- `src/infrastructure/harnesses/claude-code/settings-writer.ts:30` — manual string splicing
- `src/infrastructure/harnesses/cursor/hooks-writer.ts:18` — format-preserving JSON editor

**Analysis**: two editing mechanisms for the same job; they already disagree on the final newline
**Recommendation**: standardize on the format-preserving editor

### HIGH: Contract Duplication

#### Contract Group: Hook session payload
**Instances**: 3
**Files**:
- `src/core/contracts/session.ts` — `SessionEvent` type
- `src/infrastructure/harnesses/codex/schema.ts` — Zod schema with the same fields and no link to the type
- `src/infrastructure/harnesses/claude-code/schema.ts` — identical Zod schema

**Recommendation**: derive the shared fields from one schema and keep harness-specific fields in each adapter

---

## Architectural Anti-Patterns

### God Modules

#### `src/cli/commands/init.ts` (420 lines, 16 exports)
**Responsibilities**: detection, change planning, file writes, output formatting
**Issue**: mixes layers; untestable without the filesystem
**Recommendation**: move detection and planning to `core`, writes to `infrastructure`, and keep formatting in `cli`

### Dependency Cycles

#### Runtime cycle: `zones.ts` ↔ `telemetry.ts`
- `zones.ts` imports `formatTelemetry` from `telemetry.ts`
- `telemetry.ts` imports `classifyZone` from `zones.ts`

**Recommendation**: extract the shared types to `core/contracts`

### Layer Violations

#### `src/core/services/checkpoint-service.ts` → `node:fs`
**Issue**: a domain service reads files directly
**Recommendation**: depend on the storage port

### Blocking the Harness Process

| File | Line | Issue |
|------|------|-------|
| `src/infrastructure/harnesses/pi/extension.ts` | 52 | `readFileSync` inside the `tool_result` handler |

### Async and Process Misuse

| File | Line | Issue |
|------|------|-------|
| `src/infrastructure/git/status.ts` | 19 | Floating promise from `runGit()` |
| `src/infrastructure/process/run.ts` | 33 | `exec()` with a command string built from a path |
| `src/cli/commands/doctor.ts` | 88 | Child process without a timeout |

### Stdout Pollution

| File | Line | Issue |
|------|------|-------|
| `src/infrastructure/harnesses/claude-code/post-tool.ts` | 41 | `console.log` on the hook response path |

### Global Mutable State
- `src/infrastructure/tokenizers/cache.ts` — module-level `let` cache shared across invocations without invalidation

---

## Type-Safety Issues

### `any` (X instances)

| File | Line | Context | Severity |
|------|------|---------|----------|
| `src/infrastructure/harnesses/opencode/plugin.ts` | 27 | `(input: any)` | HIGH |

### Suppressions (Y instances)

| File | Line | Suppression | Should Fix |
|------|------|-------------|------------|
| `src/cli/commands/init.ts` | 12 | `// @ts-ignore` | Type the imported module |
| `src/infrastructure/storage/json-editor.ts` | 1 | `/* eslint-disable */` (whole file) | Remove it and fix the reported rules |

### Non-Null Assertions (Z instances)

| File | Line | Context | Severity |
|------|------|---------|----------|
| `src/core/services/boot-summary.ts` | 30 | `plan.steps.find(...)!.title` | HIGH |

### Unsafe Casts and Unvalidated Input (W instances)

| File | Line | Cast or input | Issue |
|------|------|---------------|-------|
| `src/infrastructure/harnesses/cursor/pre-tool.ts` | 18 | `JSON.parse(stdin) as CursorEvent` | Harness payload used without a schema |
| `src/infrastructure/storage/plan-file.ts` | 44 | `data as unknown as TaskPlan` | Double cast hides a shape mismatch |

### Missing Precision
- `src/core/entities/plan.ts:9` — `status: string` instead of a literal union
- `src/core/contracts/harness.ts:15` — `Record<string, unknown>` passed into core logic

---

## Code Smells

### Long Functions (>30 lines)

| File | Function | Lines | Issue |
|------|----------|-------|-------|
| `src/cli/commands/init.ts` | `runInit()` | 94 | Does too much, hard to test |

**Recommendation**: extract smaller functions

### Long Parameter Lists (4+)

| File | Function | Params | Recommendation |
|------|----------|--------|----------------|
| `src/core/services/telemetry.ts` | `buildBlock(...)` | 5 | Group into a `TelemetrySnapshot` |

### Complex Conditionals

| File | Line | Issue |
|------|------|-------|
| `src/core/services/zones.ts` | 21 | Nested 4 levels deep |
| `src/cli/output/labels.ts` | 12 | Nested ternary |

### Magic Numbers & String Keys

| File | Line | Magic Value | Should Be |
|------|------|-------------|-----------|
| `src/core/services/zones.ts` | 14 | `75` | `zones.criticalPercentage` from configuration |
| `src/infrastructure/storage/instruction-file.ts` | 8 | `"<!-- CONTEXTBRAKE:START -->"` repeated 4× | A named constant |

### Swallowed Errors

| File | Line | Issue |
|------|------|-------|
| `src/infrastructure/git/status.ts` | 60 | `catch {}` — no report, no rethrow |

### Commented-Out Code

**Files with commented code**: X
- `src/cli/commands/remove.ts` — previous implementation left in place

**Recommendation**: delete all commented-out code (git history preserves it)

### Naming

| File | Line | Issue | Should Be |
|------|------|-------|-----------|
| `src/core/utils.ts` | 1 | `utils` names no responsibility | Split by concern |
| `src/core/services/plan.ts` | 22 | `valid()` returns a boolean | `isValidPlan()` |

---

## Statistics

**Dead Code**:
- Files: X
- Exports: Y
- Lines: Z (estimated)

**Duplication**:
- Groups: X
- Files affected: Y
- Duplicated lines: ~Z

**Architectural Issues**:
- God modules: X
- Dependency cycles: Y
- Layer violations: Z
- Harness process blocking: W
- Async and process misuse: V
- Stdout pollution: U

**Type Safety**:
- Configurations without `strict`: X
- `any`: Y
- Suppressions: Z
- Non-null assertions: W
- Unsafe casts and unvalidated input: V

**Code Smells**:
- Long functions: X
- Complex conditionals: Y
- Magic numbers / string keys: Z
- Swallowed errors: W

---

## Impact Assessment

### Code Cleanup Potential
- **Dead code removal**: ~X lines
- **Duplication consolidation**: ~Y lines
- **Total reduction**: ~Z lines (AA% of codebase)

### Maintainability Improvement
- Fewer places to update when fixing bugs
- Clearer module boundaries and responsibilities
- Compiler-enforced type safety instead of runtime surprises
- Reduced cognitive load

### Risk Areas
- [Areas with high coupling, unvalidated input, blocking inside harness processes, or unsafe process execution]
