# QA report — prd-02.1-freio-por-uso-medido

## Summary

- Status: APPROVED
- Code state: HEAD `5492604` plus the uncommitted T01–T05 diff, the same state reviewed in `codereview_01` (no code change since the review)
- Latest review: `codereview_01/codereview.md` (APPROVED WITH RESERVATIONS; reservations OI-01..OI-03 accepted under DEC-HIL-05)
- Previous QA: —
- QA session: `bdc9931c-2075-4cdb-b3c2-c61fb222be2d`. It wrote no code of this feature, and the review session changed no code.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 |
| Platforms | Windows 11 Pro (Git Bash; hooks spawned as child processes; paths with spaces and accents). Linux and macOS did not run locally; they are covered by the CI matrix per the TechSpec test approach (DEC-HIL-02). |
| Harness | Claude Code 2.1.282 (headless `claude -p`) for manual acceptance |
| Build command | `npm run build` |
| Fixtures | Temporary git repositories created by `scratchpad/qa-driver.mjs` (CLAUDE.md with user content, `.claude/settings.json`, `src/app.ts`, synthetic transcripts with the field shape of `tests/fixtures/harnesses/claude-code/transcript-*.jsonl`); scratch repo `manual-AaxO` for the manual session. No real repository or user-level harness configuration was modified. |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| OBJ-01 | TC-04, TC-18 | end-to-end + manual | PASSED | `evidence/results.json` S2.1 (200 calls: 0 denials, 0 blocks); `evidence/manual-session.md` (turns 1–34 GREEN, 0 blocks) |
| OBJ-02 | TC-13, TC-17 | end-to-end + manual | PASSED | S3.1 (`tokens=194431/128000 source=measured`); `evidence/real-transcript.json`; `evidence/manual-session.md` (every ledger value equals the transcript usage sum) |
| OBJ-03 | TC-07, TC-08 | end-to-end + manual | PASSED | S3.2, S3.3, S2.0; manual: the agent kept working in YELLOW without a plan |
| OBJ-04 | TC-16 | integration | PASSED | `tests/integration/runtime-overhead.test.ts` and `claude-transcript-usage.test.ts` pass in the review's coverage run; real transcript read in 3.9 ms (`evidence/real-transcript.json`) |
| FR-01 | TC-01, TC-04, TC-18 | end-to-end | PASSED | S2.1; S3.5 (80% denies a code read); S4.1 (20 turns with limits, 0 denials) |
| FR-02 | TC-02, TC-03 | end-to-end + unit | PASSED | S4.1 (`turn=6/10 zone=YELLOW`, `turn=10/10 zone=RED`, RED at turn 20, never CRITICAL); invalid pair rejected (exit 2) with field and rule at schema level (TC-03), see OBS-01 |
| FR-03 | TC-05 | end-to-end | PASSED | S3.1 `turn=1` without a ceiling; S4.1 `turn=6/10` with limits |
| FR-04 | TC-13, TC-14, TC-17 | end-to-end + manual | PASSED | S3.1, S3.6 (sidechain ignored), S3.7 (subagent keeps the estimate), real transcript, manual session |
| FR-05 | TC-15, TC-17 | end-to-end | PASSED | S2.1/S2.2 (missing transcript → estimate, no error log), S3.10 |
| FR-06 | TC-11, TC-12 | end-to-end | PASSED | S3.8 (after `compact`, the 80% reading is ignored), S3.9 (the next response is measured again) |
| FR-07 | TC-10, TC-22 | end-to-end | PASSED | S3.1 window 128000 = `contextWindowCeiling`; README budget note verified in the review |
| FR-08 | TC-07, TC-08, TC-09 | end-to-end + manual | PASSED | S3.2/S3.3 (no-plan texts), S3.4 (with-plan text), S2.0/S4.0 (installed protocol); manual YELLOW/RED blocks |
| FR-09 | TC-03, TC-19, TC-20 | end-to-end | PASSED | S1.1, S1.3–S1.7, S1.9, S1.10 (retired and ignored-field warnings, dry-run, migration, idempotency, custom limits kept) |
| FR-10 | TC-21, TC-22 | end-to-end | PASSED | S1.2 (`doctor` capability text), S2.0 (protocol); docs verified in `codereview_01` |
| NFR-01 | TC-16 | integration | PASSED | Same as OBJ-04 |
| NFR-02 | TC-15 | end-to-end | PASSED | S3.10 (torn tail and invalid lines skipped, error log empty) |
| NFR-03 | TC-15, TC-17 | end-to-end | PASSED | S3.11 (no transcript text in runtime state, stdout, or stderr) |
| NFR-04 | TC-03, TC-06 | end-to-end + gate | PASSED | Block prefix `v2` in all runs; `schemas:check` and budget test pass in the review |
| NFR-05 | TC-23 | gate | PASSED | `codereview_01` Executed validations (lint, typecheck, coverage 95.43%, `schemas:check`, `package:smoke`) |
| NFR-06 | TC-16 | end-to-end (Windows) | PASSED on Windows; Linux/macOS NOT VERIFIABLE locally | Accented and spaced paths in S3 and TC-16; Linux/macOS via the CI matrix after push |
| Manual acceptance (TechSpec) | — | manual | PASSED | `evidence/manual-session.md` |

## End-to-end runs

All runs spawn `node dist/src/cli/main.js …` or the installed `.claude/hooks/context-brake.mjs <Event>` as child processes, with `NO_COLOR=1` for the CLI. Full commands, exit codes, and output (truncated at 2,000 characters) are in `evidence/runs.json`; per-check results are in `evidence/results.json`.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| S1 legacy diagnosis and migration (S1.0–S1.10) | temp repo `cb-qa-legacy-*` | `init --yes`; `doctor --json`; `doctor`; `init --dry-run`; `init --yes` ×2 | 0 for init; 1 for doctor with a warning; 0 after migration | PASSED | `evidence/results.json` |
| S1.11 invalid turn pair | same | `doctor --json` | 2 | Rejected; generic CLI message (OBS-01) | `evidence/s1-11-note.md` |
| S2 200 calls, default config, no transcript | temp repo `cb-qa-long-*` | hook `PreToolUse`/`PostToolUse` ×200 | 0 | PASSED | S2.0–S2.2 |
| S3 measured usage, plan variants, deny, sidechain, subagent, compaction, torn tail, privacy | temp repo `cb-qa-measured-*`, transcript under `transcrições com espaço/sessão.jsonl` | hook `SessionStart`/`PreToolUse`/`PostToolUse` | 0 | PASSED | S3.1–S3.11 |
| S4 optional turn limits 5/9, `injectionMode: always` | temp repo `cb-qa-turns-*` | `init --yes`; hook ×40 | 0 | PASSED | S4.0–S4.1 |
| Real transcript reader | this QA session's transcript (read-only) | `node scratchpad/real.mjs dist <transcript>` | 0 | PASSED | `evidence/real-transcript.json` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| TechSpec: real Claude Code session with the built package, 30+ tool calls below 50%, then usage past 50% | QA agent via headless `claude -p` in scratch repo `manual-AaxO`, authorized by the user (DEC-HIL-06) | 37 calls, all `source=measured`; turns 1–34 GREEN (21%–42%) with no block and no deny; YELLOW blocks at 57% and 63%, RED at 69%, each `source=measured` with the no-plan actions; the agent finished the work and ended with `[REQUEST_SESSION_RESET]` | PASSED |

## Findings

No `BUG-NN` findings.

### Observations

| ID | Obligation | Fact | Evidence | Note |
| --- | --- | --- | --- | --- |
| OBS-01 | FR-02 (field and rule) | For any invalid config, `doctor` and `init` print `Configuration validation failed.` without the field or rule. The hook's error log names the field (`telemetry.zones.greenMaxTurn`); the schema reports field and rule (TC-03). | `evidence/s1-11-note.md` | Pre-existing: the same message appears for invalid percentages, and `doctor-checks.ts` is unchanged in this respect since base `3b94a9c`. Not caused by this feature; a candidate improvement for the CLI's config diagnostics. |

## Previous findings (re-run only)

Not applicable.

## Limitations and open items

- Linux and macOS did not run locally (NFR-06); they depend on the CI matrix after the push, as the TechSpec sets.
- The manual session ran headless (`claude -p`) rather than interactively. The hooks, transcript, and ledger paths are the same, but `SessionStart` sources other than `startup` were covered only by the S3 fixture runs.
- Accepted reservations from `codereview_01` (DEC-HIL-05): OI-01 (test file line counts), OI-02 (legacy 7/10 turn limits stay active until `init --yes`), OI-03 (an unparseable transcript timestamp is never treated as stale).
- `boot-git-delivery.test.ts` failed once under full parallel load during the review and passed on rerun (`codereview_01` limitations); not related to this feature.
- The feature is uncommitted; the Git index still flags 7 files as unmerged, and `stash@{0}` is kept (user's call).

## Conclusion

Every PRD acceptance obligation was verified against the built CLI and hook, and the TechSpec's manual acceptance passed in a real Claude Code session with measured usage. There are no failures. Linux/macOS coverage remains with CI, as planned, and the accepted review reservations stay open for the user's decision.
