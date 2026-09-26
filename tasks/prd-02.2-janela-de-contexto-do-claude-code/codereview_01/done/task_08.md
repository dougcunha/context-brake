# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T08 — Doctor warns when the real local settings file is tracked through a symlinked `.claude`

## Outcome

`doctor` emits `STATUSLINE_LOCAL_TRACKED` when the file that actually holds the local settings is not git-ignored, including when `.claude` is a symlink (as in this repository, where `.claude` points to `.agents`).

## Dependencies and boundaries

- Depends on: —
- Unblocks: T12
- In scope: `isLocalSettingsTracked` path resolution and TC-16.
- Out of scope: the other three warnings; OI-01 (ledger selection).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#findings` | `git check-ignore` on the link path misses the real target (FR-07, US-04, symlinked configs in `AGENTS.md`) |

## Requirements

- Resolve the real target with `resolveChangeTarget(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE)` and check it relative to the root; when link and target differ, warn if either is not ignored.
- A target outside the repository is not checked by git and yields no warning.
- A git timeout or missing runner yields no warning, as today.

## Context to recover on demand

- TechSpec: DEC-10, TC-16
- Rules and skills: `harness-adapters.md`, `file-changes.md`, `tests.md`, the `AGENTS.md` symlink constraint
- Code: `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts:isLocalSettingsTracked`; `src/infrastructure/harnesses/common/change-target.ts:resolveChangeTarget`

## Work

- [x] T08.1 Resolve and check the real target (and the link path when different).
- [x] T08.2 Add a symlinked-`.claude` case to TC-16, skipping where the platform cannot create symlinks, as `symlinked-harness-config.test.ts` does.

## Acceptance criteria

- In a fixture where `.claude` links to `.agents`, `/.claude` is ignored, and `.agents/settings.local.json` is not, `doctor` reports `STATUSLINE_LOCAL_TRACKED`.
- `node dist/src/cli/main.js doctor --json --harness claude-code` on this repository reports it.

## Verification

- Unit: TC-16 with link and non-link fixtures.
- Integration: existing doctor suites.
- End-to-end: not applicable.
- Manual: doctor on this repository, as above.
- Platforms: Linux, macOS, Windows (T12).
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage -- --coverage.reportOnFailure`
- Expected evidence: new TC-16 case green; doctor JSON shows the warning here.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts`, `tests/unit/statusline-diagnostics.test.ts`

## Observability and recovery

- Operational signal: `STATUSLINE_LOCAL_TRACKED` finding with its remediation.
- Recovery: revert; the check only adds a warning.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `STATUSLINE_LOCAL_TRACKED` now checks the link path and the real target (`resolveChangeTarget`, made relative to the real root) and names the path that is not ignored in its message and remediation. Root cause found beyond the symlink: the production `doctor` never passes a `ProcessRunner` in `HarnessContext` (`main.ts` builds `{projectRoot}` only), so the check always returned false outside tests. The check now falls back to its own `NodeProcessRunner` for `git check-ignore` only; the shared context is unchanged so harness version probing stays off. `doctor` on this repository now prints `STATUSLINE_LOCAL_TRACKED: .agents/settings.local.json is not ignored by Git.`
- Changed files: `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts` (72 lines), new `tests/unit/statusline-diagnostics-symlink.test.ts` (3 cases: link ignored and target tracked, both ignored, plain directory checks one path).
- Checks: Unit: statusline diagnostics suites 12/12 (junction created, no skip). Integration/e2e: 10 doctor and status line files 23/23. `npm run lint` pass, `npm run typecheck` pass, `npm run build` pass. Manual: `node dist/src/cli/main.js doctor --harness claude-code` on this repo shows the warning with `.agents/settings.local.json`. Full suite after T09 (shared run): `npx vitest run --coverage --coverage.reportOnFailure` 262/262 files, 1714 passed, 3 skipped, 95.31% statements, 90.76% branches.
- Validated state: HEAD 5917593 plus uncommitted worktree; Windows 11 junction for `.claude`; 2026-09-26.
- Open items: `doctor` now spawns `git check-ignore` once or twice when the bridge state exists; no other command changes. The fallback branch is exercised by the built-CLI runs, not by in-process unit tests.
