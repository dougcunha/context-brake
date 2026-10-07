# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_01/codereview.md`
2. This file

---

# T10 — In-process commands start no git or version-probe process

## Outcome

In-process `init`, `doctor`, and `remove` tests run with a fake `ProcessRunner`. They no longer start `git check-ignore` or `<harness> --version`, which under 6 workers made `git.exe` fail with error 0xc0000142 dialogs on Windows.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_01
- In scope: `tests/helpers/fake-process-runner.ts` and its injection wherever the fake overhead measurer is injected, plus the direct `runInit`/`runRemove`/`runDoctor`/`dispatchCommand` callers.
- Out of scope: product code; the listed process tests.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01 optional improvement | `codereview.md#Findings` | In-process doctor still spawns `git check-ignore` |
| DEC-EXC-02 | `../../workflow.md#Human Decisions Log` | User report of repeated `git.exe` 0xc0000142 dialogs; the decision keeps this task and supersedes the DEC-EXC-01 optional choice |
| DEC-02 | `../techspec.md#technical-decisions` | In-process tests start no process |

## Work

- [x] T10.1 Add the fake runner: `discover` finds nothing, and `run` completes with exit 0, which counts as ignored for `git check-ignore`.
- [x] T10.2 Inject it in `delegated-world`, `in-process-cli`, `statusline-world`, and the direct callers.

## Acceptance criteria

- No helper or direct caller of an in-process command lacks the fake runner.
- The full suite passes.

## Handoff

- Produced result: the fake runner is injected in `tests/helpers/{delegated-world,in-process-cli,statusline-world}.ts` and in `tests/integration/{doctor-context-window-schema,doctor-manual-removal,invalid-config,linked-project-root,doctor-asset-currency,runtime-state-removal,safe-removal}.test.ts`. `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts:62` builds `NodeProcessRunner` only when no runner is injected, so in-process tests no longer start `git check-ignore`. The version probes (`src/infrastructure/harnesses/common/version-probes.ts:12-14`) already returned `unknown` without a runner and build none, so their behavior is unchanged; with the fake runner they find no executable. (Corrected by codereview_03 task T12.)
- Remaining deliberate `git` starts: `codex-hook-command-shells` and `codex-hook-root` (`git init`), the `git-capability` probe, and the built `doctor` smoke (one `git check-ignore` per run).
- Changed files: created `tests/helpers/fake-process-runner.ts`; modified the 10 files above.
- Checks: `npm run typecheck` and `rtk proxy npx eslint .` are clean. The full `npm run test:budget` passes at 113.8 s, exit 0, under concurrent load on the machine.
- Validated state: base `cca3a29` plus T01-T07 and round 1; Windows 11, Git Bash.
- Open items: the maintainer confirms that the 0xc0000142 dialogs stop during a full run ("Não observei ainda" at DEC-EXC-02; carried to HIL 3).
