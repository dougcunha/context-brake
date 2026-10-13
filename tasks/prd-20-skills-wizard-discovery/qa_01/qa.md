# QA report — 20-skills-wizard-discovery (skill discovery and alternatives in the init wizard)

## Summary

- Status: APPROVED
- Execution: delegated QA runner
- Code state: HEAD `7295a433a4f1f79430b0c5281cb46ab8495b6db6` plus the uncommitted worktree as found (this feature's files are listed in `slice-scope.txt`; slice 19 files in the same worktree were not under test). `dist/` was rebuilt from that state with `npm run build` before any scenario.
- Latest review: `codereview_02/codereview.md` (APPROVED WITH RESERVATIONS, cycle closed)
- Previous QA: —

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 |
| Platforms | Windows 11 Pro 10.0.26200 (Git Bash). Linux and macOS could not run here. |
| Isolation | Before the first command `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME` pointed at a temporary directory (`os.homedir()` verified to resolve there); `NO_COLOR=1`. Every fixture lives in a temporary directory outside the worktree. `init` and `remove` were never run against this repository. |
| Build command | `npm run build` (schemas:generate, assets:build, tsc); no tracked file changed content |
| Terminal driver | `winpty` (shipped with Git for Windows) gave the built CLI a real pseudo-terminal, driven by a Node script (`evidence/scripts/pty-probe.mjs`) |
| Fixtures | Temporary projects created by the scripts in `qa_01/evidence/scripts/`: one project per harness with its declared folders, an edge-case project, a 1000-directory project, a 1 MB `SKILL.md` project, and a copy of this repository's `.agents/skills` placed in `.claude/skills` and `.agents/skills`. `tests/fixtures/` holds no skill-catalog fixture; the feature's own tests build theirs in temporary directories. |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 catalog per harness, empty without folders | TC-01 | end-to-end (built reader, 8 harnesses) + integration | PASSED | `evidence/reader-harnesses.txt` section 1; `evidence/feature-tests.txt` |
| FR-02 frontmatter only, name rule, bounds, symlinks | TC-02, TC-12 | end-to-end (built reader) + integration | PASSED | `evidence/reader-harnesses.txt` section 2; `evidence/feature-tests.txt` |
| FR-03 snapshot scoring | TC-03 | end-to-end (built services on the copied repository skills) + unit | PASSED | `evidence/reader-harnesses.txt` section 3; `evidence/pty/pty-plain-1.txt` |
| FR-04 resume scoring, snapshot skill excluded, asked only after a snapshot skill | TC-04, TC-05 | end-to-end (PTY) + unit | PASSED | `evidence/pty/pty-s2.txt`, `pty-s4.txt` |
| FR-05 options order, recommended, 3 alternatives, type another, none; Enter keeps | TC-05, TC-13 | end-to-end (PTY, readline and terminal-select) + unit | PASSED (Enter keeping a pre-configured value by unit test only) | `evidence/pty/pty-plain-1.txt`, `pty-s3.txt`, `pty-s7.txt`; `evidence/feature-tests.txt` |
| FR-06 union across harnesses, annotated origin | TC-06 | end-to-end (PTY) + unit | PASSED | `evidence/pty/pty-s9-multi.txt` |
| FR-07 nothing scanned with flags or non-interactive terminals | TC-07, TC-14 | end-to-end with a file-system tracer + integration | PASSED | `evidence/cli-runs-summary.txt` |
| FR-08 catalog failure falls back with a stderr warning | TC-08 | end-to-end (real denied folder) + unit | PASSED | `evidence/pty/pty-s8-denied.txt`, `evidence/reader-denied-folder.txt` |
| NFR-01 only the validated name stored or shown | TC-09 | end-to-end (config written) + unit | PASSED | `evidence/pty/pty-s6.txt` (config holds bare names); `evidence/feature-tests.txt` |
| NFR-02 200 skills within 500 ms | TC-10 | benchmark | PASSED | `evidence/bench-skill-catalog.txt` |
| NFR-03 scoring pure in `core` over a port | TC-11 | static | PASSED | `evidence/static-checks.txt` |
| NFR-04 Windows, symlinks and junctions | TC-12 | end-to-end (built reader) + integration | PASSED on Windows; Linux and macOS NOT VERIFIABLE | `evidence/reader-harnesses.txt` section 2 |
| NFR-05 words, not color | TC-13 | end-to-end (`NO_COLOR=1`, plain and terminal-select prompts) + unit | PASSED | `evidence/pty/*.txt` |
| OBJ-01..OBJ-04, US-01..US-04 | TC-01, TC-03..TC-06 | as above | PASSED | as above |
| TC-14 built `init --yes` smoke unchanged, reads no skill folder | TC-14 | end-to-end | PASSED | `evidence/feature-tests.txt` (`tests/e2e/e2e-init.test.ts`), `evidence/cli-runs-summary.txt` |
| Regression gates | — | lint, typecheck, schemas:check, dependencies:check, full `npm test` | PASSED | `evidence/gates.txt` (268 files, 1397 passed, 1 skipped, 141 s wall, budget 180 s) |

## End-to-end runs

All runs use `node dist/src/cli/main.js` (or the built modules) with the isolated environment above. Pair A has no skills; pair B has skill folders (`sdd-snapshot`, `sdd-orchestrate-flow`, `commit`) in `.claude/skills` only ("claude-only") or in all eight folders ("eight-folders"). Output is compared after normalising the temporary path.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-01 eight harnesses | one project per harness | built `createSkillCatalogReader()` for each of the 8 ids; folders equal the TechSpec table; every declared folder read; other harnesses' folders ignored; empty project gives empty list and no warning | 0 | PASSED (64 checks) | `evidence/reader-harnesses.txt` |
| TC-02, TC-12 edge cases | edge project | names with `a/b`, `a b`, `$x`, `Upper`, unclosed frontmatter ignored; CRLF, BOM, quoted, namespaced, block-scalar kept; name beyond 8 KiB not read; directory symlink and junction resolved; broken junction and a `SKILL.md` directory give no failure | 0 | PASSED | `evidence/reader-harnesses.txt` section 2 |
| TC-02 bounds | 1000 directories; 1 MB `SKILL.md` | built reader | 0 | PASSED: 500 skills (the first 500 in name order) in 93 ms; the 1 MB file still yields its name | `evidence/reader-harnesses.txt` |
| TC-03, TC-04, TC-06 ranking | copy of this repository's skills in `.claude/skills` and `.agents/skills` | built `mergeCatalogs` and `rankSkills` | 0 | PASSED: snapshot order `sdd-snapshot`, `sdd-orchestrate-flow`, `sdd-triage` (`commit` absent); resume order `sdd-orchestrate-flow`, `sdd-orchestrate-prds`, `sdd-orchestrate-tasks`, `herdr-orchestration`, ... with `sdd-snapshot` excluded | `evidence/reader-harnesses.txt` section 3 |
| TC-07, TC-14 init without scanning | claude-only A/B, eight-folders A/B | `init --yes`; `init --yes` again; `init --yes --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow`; `init --yes --json`; `init --json --dry-run`; `init --dry-run --yes`; `init --snapshot-command sdd-snapshot --yes --json` | equal for A and B in every run | PASSED: exit codes, stdout and stderr identical; `--json` stdout parses; resulting files identical; skill folders intact; the file-system tracer (wrapping `fs`, `fs.promises` and `fs/promises`) logged no access to any path containing `skills` during any B run, and logged 14 events in the positive control that calls the reader under the same tracer | `evidence/cli-runs-summary.txt`, `evidence/cli-*.txt` |
| Non-TTY wizard request | project with skills | `init` and `init --interactive` with piped stdin | 2 (`init`, confirmation required) / 64 (`init --interactive`) | PASSED: no prompt; explicit errors naming `--yes` and the flags; no write | `evidence/cli-nontty-init.txt`, `cli-nontty-init_interactive.txt` |
| Real wizard, defaults (readline prompts) | repository skills in `.claude/skills` | `init --interactive --dry-run` under a PTY, Enter at each question | CLI printed `[OK] ContextBrake init (dry_run)` | PASSED: snapshot list `sdd-snapshot (recommended) — found in .claude/skills`, 2 alternatives, `type another`, `none`; resume list led by `sdd-orchestrate-flow`, no `none`; equivalent command `--snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow` | `evidence/pty/pty-plain-1.txt` |
| Alternative chosen | same | answer `2` at the snapshot question | as above | PASSED: resume list now starts at `sdd-orchestrate-prds`; the chosen snapshot skill is absent | `evidence/pty/pty-s2.txt` |
| Type another | same | `4`, then `/x`, then `my-own-skill` | as above | PASSED: `/x` refused with the bare-name hint and re-asked; the valid name accepted | `evidence/pty/pty-s3.txt` |
| None | same | answer `5` | as above | PASSED: no resume question, handoff text shown | `evidence/pty/pty-s4.txt` |
| No skills in the project | project without skill folders | typed `some-skill` | as above | PASSED: typed questions only (`Snapshot skill name`, `Resume skill name`), no error | `evidence/pty/pty-s5.txt` |
| Applied run | repository skills | `init --interactive` under a PTY, Enter at each question, `y` at the confirmation | `[OK] ContextBrake init (applied)` | PASSED: `context-brake.config.json` holds `"command": "sdd-snapshot"` and `"resumeCommand": "sdd-orchestrate-flow"` (bare names) | `evidence/pty/pty-s6.txt` |
| Terminal-select prompt (clack, default) | same | `init --interactive --dry-run` under a PTY, `TERM=xterm` | CLI ran to the end | PASSED: select list shows `sdd-snapshot (recommended) (found in .claude/skills)`, alternatives, `type another`, `none`; the label has the words `recommended` and `found in` | `evidence/pty/pty-s7.txt` |
| Several harnesses (FR-06) | `.claude/skills` plus `.agents/skills` (`sdd-snapshot` in both, `codex-handoff` only in the second) | harnesses `1 2` | as above | PASSED: `sdd-snapshot (recommended) — found in .claude/skills, .agents/skills`, then `codex-handoff — found in codex-cli (.agents/skills)`, then the claude-only skills annotated `found in claude-code (.claude/skills)` | `evidence/pty/pty-s9-multi.txt` |
| FR-08 unreadable folder | `.claude/skills` with an NTFS deny-list ACL (temporary fixture, ACL removed afterwards) | built reader, then the wizard under a PTY | wizard continued | PASSED: reader returns `warnings: [".claude/skills: EPERM"]` and still reads the other folder; the wizard prints one `WARN: Some skill folders could not be read (.claude/skills: EPERM); the list may be incomplete.` and shows the typed question | `evidence/reader-denied-folder.txt`, `evidence/pty/pty-s8-denied.txt` |
| TC-10 | 200 skills | `npx vitest run --config vitest.bench.config.ts tests/bench/skill-catalog.test.ts` | 0 | PASSED (p95 under 500 ms; the test took 990 ms for all its scans) | `evidence/bench-skill-catalog.txt` |
| TC-11 | source | `rg` for infrastructure/cli imports and harness ids in `core` files, sync fs in the reader, `any`, suppressions, empty catches, files above 100 lines | 0 hits | PASSED | `evidence/static-checks.txt` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| TechSpec lists no manual script ("Manual acceptance: none required"). A real TTY run of the picker was marked conditional on the QA run being able to drive a pseudo-terminal. | delegated QA runner (agent) | A pseudo-terminal was available through `winpty`; both prompt modes (readline and terminal select) were driven against the built CLI with the scenarios in the table above. | PASSED |

## Findings

No `BUG-NN`.

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — |

Observations that are not defects:

- A directory whose `SKILL.md` has no frontmatter at all (for example `# Just a title`) is offered under its folder name; an unclosed frontmatter with an invalid `name` is ignored. This matches the PRD assumption ("`name` in the frontmatter, or the folder name when absent") and the existing test `skill-catalog-reader.test.ts`.
- A `SKILL.md` that is a directory produces the warning `...: EISDIR`, not a failure.
- Reservation OI-01 of `codereview_02` (a configured resume skill equal to a newly chosen snapshot skill is still preselected) was not re-exercised end to end; it is a recorded optional improvement, decided by the review.

## Previous findings (re-run only)

Not a re-run.

## Limitations and open items

- Linux and macOS were not run (NFR-04); the code uses `node:path` and `fs/promises` only. Symlink and junction behavior was verified on Windows.
- The POSIX `EACCES` test of `skill-catalog-bounds.test.ts` is skipped on Windows. The same warning path was exercised on Windows by an NTFS deny ACL, which yields `EPERM`; `EACCES` itself is not verified.
- `winpty` returned exit code 3 at the end of every PTY run together with `Assertion failed: ... wp != nullptr && cols > 0 && rows > 0` on stderr. This is the pseudo-terminal wrapper failing to tear down in a console-less host; the CLI had already printed its final `[OK]` line, and the applied run wrote its files. The exit code of the CLI itself in the PTY runs is therefore not observed; the CLI exit codes were observed in the piped runs (`evidence/cli-*.txt`).
- Enter keeping a pre-configured skill (a second `init` over an existing configuration) was verified by the in-process tests only (`questions-skill*.test.ts`), not in the PTY.
- Vendor documentation behind the folder constants was not re-fetched (outside QA); the folders were checked against the TechSpec table, not against the vendors.
- `npm run package:smoke` was not run.
- The worktree check: `git status --porcelain` is identical before and after, apart from the `qa_01/` folder. The only scoped files with a newer modification time are `schemas/*.json`, rewritten by `npm run build` (`schemas:generate`); `npm run schemas:check` passes and a content hash taken right after the build matched the one before it.
- The first line of the earlier fixture runs used a tracer that matched the `dist/` module paths; the final results come from the corrected run, kept in `evidence/cli-runs-summary.txt`.

## Conclusion

Every acceptance obligation of the PRD has a passing verification route against the code state under test. The built reader returns the expected skills for all eight harness folder sets and handles the bounds, malformed, symlink and junction cases; the ranking puts `sdd-snapshot` and `sdd-orchestrate-flow` first on a copy of this project's skills without look-alikes winning; the real wizard, driven through a pseudo-terminal in both prompt modes, offers the recommended match, alternatives, type another and none, excludes the snapshot skill from the resume question, annotates origins across harnesses, falls back with one warning when a folder cannot be read, and stores bare names. `init --yes`, `--json` and flag runs produce identical output with and without skill folders and touch no skill folder (tracer with a positive control), so TC-14 and FR-07 hold. Lint, typecheck, schema currency, dependency scripts, the full test suite (141 s of the 180 s budget) and the benchmark pass. No defect was found; the open items are platforms and one error code that could not be exercised here.
