# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_02/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — Reinstall this repository with the corrected build

## Outcome

This repository's installed hook assets match the current build. `doctor` here reports no `ASSET_OUTDATED` and no error. The installed Claude Code hook no longer contains `normalizeEventToolPaths`.

## Dependencies and boundaries

- Depends on: codereview_01 T08 and T09 (done)
- Unblocks: re-review of codereview_02
- In scope: `npm run build`, then `node dist/src/cli/main.js init --yes` and `node dist/src/cli/main.js doctor` in this repository (DEC-15).
- Out of scope:
  - source changes;
  - codereview_02 OI-01 to OI-04;
  - re-running MA-01.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#Findings` | Installed `.claude/hooks/context-brake.mjs` predates T08 and still runs the deleted normalizer; `doctor` reports `ASSET_OUTDATED` |
| FR-11, DEC-15 | `prd.md#Functional requirements`; `techspec.md#Technical decisions` | This repository on the single mode, installed with the new build |

## Requirements

- `init --yes` without snapshot flags keeps the `snapshot` and `autoRestart` sections of `context-brake.config.json` unchanged (DEC-T07-01).
- Content ContextBrake does not own stays unchanged.

## Context to recover on demand

- Rules: `file-changes.md`.
- Code: `dist/assets/runtime/claude-code-hook.mjs`; `.agents/hooks/context-brake.mjs` (through the `.claude` junction).

## Work

- [x] T10.1 Build, then run `init --yes` in this repository.
- [x] T10.2 Run `doctor`; check the config is unchanged and the installed hook matches the built asset.

## Acceptance criteria

- `rg -c normalizeEventToolPaths .agents/hooks/context-brake.mjs` finds nothing.
- `doctor` reports no error and no `ASSET_OUTDATED`.
- `context-brake.config.json` is byte-identical to its state before `init`.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: the `doctor` run in this repository (owner: coordinator).
- Platforms: Windows (local).
- Environment dependency: none.
- Commands: `npm run build`, `node dist/src/cli/main.js init --yes`, `node dist/src/cli/main.js doctor`.
- Expected evidence: the `doctor` findings, an empty `rg`, and an identical config.

## Affected files

- Modify: the installed hook assets, settings, and manifest that `init` owns (`.agents/hooks/*.mjs`, `.agents/settings.json`, `.context-brake/manifest.json`), only where they differ from the build.

## Observability and recovery

- Operational signal: `doctor` output.
- Recovery: rerun `init` from the previous build.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (CR-01, FR-11, DEC-15): this repository is reinstalled from the post-T09 build. `init --yes` (applied, exit 0) rewrote `.claude/hooks/context-brake.mjs` (`[create]`, through the `.claude` → `.agents` junction) and updated `.context-brake/manifest.json`. Nothing else changed.
- Changed files: `.agents/hooks/context-brake.mjs`, `.context-brake/manifest.json`. By sha256 before and after: `.agents/settings.json` and `.agents/hooks/context-brake-statusline.mjs` are unchanged, and `context-brake.config.json` is byte-identical (`cmp`).
- Checks:
  - `npm run build` passes.
  - `rg -c normalizeEventToolPaths .agents/hooks/context-brake.mjs` finds nothing, and `cmp` against `dist/assets/runtime/claude-code-hook.mjs` shows the files are identical.
  - `node dist/src/cli/main.js doctor` exits 1 with warnings only and no error and no `ASSET_OUTDATED`. The warnings are `RUNTIME_ERRORS_RECORDED` (the historical 2,094 `INVALID_CONFIG` lines), `VERSION_FLOOR_UNVERIFIED`, and Claude Code overhead of 182.1 ms against the 100 ms target, a reported limitation since T07.
- Validated state: base `1474f54` plus the uncommitted T01-T07 diff, T08, T09, and this reinstall; Windows 11, Git Bash.
- Open items: none. MA-01 was not re-run; T08 removed only unused path work from the hook.
