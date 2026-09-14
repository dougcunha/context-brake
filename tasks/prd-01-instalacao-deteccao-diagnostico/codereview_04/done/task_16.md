# T16 — Bind the corrected tree to a revision and capture complete CA-20 platform evidence

## Outcome

Current state, closed under `DEC-01` (2026-09-14): revision `58082e5`, which contains T12–T15 and T17–T22, has green, SHA-bound evidence for six matrix cells, Ubuntu on WSL 2 and Windows, each on Node 20, 22, and 24. The evidence includes E2E-10 execution of CA-01, CA-05, and CA-07 and Windows PowerShell and Git Bash coverage. The three macOS cells were waived by `DEC-01` and not run; they are not passing evidence.

> Superseded by `DEC-01` (2026-09-14), original outcome: "One immutable revision containing T12–T15 has reviewable, green evidence for the full Node 20/22/24 matrix on Ubuntu, macOS, and Windows, including E2E-10 execution for CA-01, CA-05, and CA-07 plus Windows PowerShell and Git Bash coverage. The task remains pending until that external evidence exists."

## Dependencies and boundaries

- Depends on: T12, T13, T14, T15, T17, T18, T19, T20, T21, T22.
- Unblocks: `codereview_04/CR-01`, `codereview_05/CR-01`, and the PRD-01 approval decision.
- In scope: identifying one immutable corrected revision, running the existing CI matrix or equivalent recorded platform runs, proving E2E-10 executed rather than skipped, and recording durable job/artifact references in this task's Handoff.
- Out of scope: claiming success from workflow declaration or local Windows output, weakening link tests, changing product behavior or CI workflow configuration, creating a remote without explicit authorization, or treating an uncommitted worktree as immutable evidence.
- Scope note (`DEC-01`, 2026-09-14): SHA-bound runs on local Windows and on WSL 2 are accepted as equivalent recorded runs. Unbound local output still does not count.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_04/CR-01` | `codereview.md#findings` | State at that review: the repository has no commit, remote, or CI artifact; current execution proves only Windows PowerShell and Scoop Git Bash, so Linux/macOS CA-20 evidence is missing. Resolved under `DEC-01` by the recorded Linux (WSL 2) and Windows runs; macOS waived. |
| `codereview_05/CR-01` | `codereview.md#findings` | State at that review: same obligation, still open at the `codereview_05` review, with no commit, remote, or CI artifact and T16 pending. Added by `codereview_05` correction planning, which reuses this task instead of creating a duplicate. Resolved under `DEC-01`; `codereview_06` records it as resolved by decision and accepted evidence. |
| PRD | CA-20 and platform restriction | CA-01, CA-05, and CA-07 must pass on Linux, macOS, and Windows with the required shell coverage. Accepted scope under the CA-20 exception and `DEC-01`: Linux (WSL 2) and Windows; macOS waived. |
| TechSpec | E2E-10 and build-order item 8 | Critical built-CLI scenarios and the full Linux/macOS/Windows CI matrix must pass before feature completion. Accepted scope under `DEC-01`: Linux (WSL 2) and Windows; macOS waived. |

## Requirements

- Use a commit SHA or equivalent immutable revision that contains the completed T12–T15 corrections and exactly matches every recorded run.
- That revision must also contain the completed `codereview_05` corrections T17–T22 (added by `codereview_05` planning). Runs from the initial commit `8401e7f` predate them and do not satisfy this task.
- Under `DEC-01`: execute Node 20, 22, and 24 on Ubuntu (WSL 2) and Windows, six successful combinations with install, schema, dependency, build, typecheck, lint, test, coverage, and package-smoke gates. The three macOS combinations are waived and not run.
- In every required platform slice, retain evidence that E2E-10 CA-01/CA-05/CA-07 test bodies executed. After T14, any required CI link-capability failure must fail the job rather than produce a misleading green result.
- Retain Windows evidence for both PowerShell and Git Bash launch variants. For every executed job, record runner OS/image, Node version, shell variant, immutable revision, timestamps, evidence location (job URL, artifact identifier, or a `DEC-01` equivalent-run log path and hash), and outcome.
- Do not mark T16 complete when any executed cell fails, runs against a different revision, skips at the required link boundary, or is accessible only as an unbound local log. Under `DEC-01`, the unexecuted macOS cells do not block completion.

> Superseded by `DEC-01` (2026-09-14): "Execute Node 20, 22, and 24 on Ubuntu, macOS, and Windows: nine successful matrix combinations with install, schema, dependency, build, typecheck, lint, test, coverage, and package-smoke gates."
> Superseded by `DEC-01` (2026-09-14): "Retain Windows evidence for both PowerShell and Git Bash launch variants and record runner OS/image, Node version, shell variant, immutable revision, timestamps, job URL/artifact identifier, and outcome."
> Superseded by `DEC-01` (2026-09-14): "Do not mark T16 complete when any matrix cell is missing, rerun against a different revision, skipped at the required link boundary, or accessible only as an unbound local log."

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — E2E-10, build-order item 8, and `DEC-01` in Key Decisions.
- Rules and skills: `.agents/rules/node.md`, `.agents/rules/tests.md`, `AGENTS.md`, `sdd-execute-task`, `sdd-review-code` evidence/status rules.
- Code: `.github/workflows/ci.yml` — declared matrix and gates; `tests/e2e/e2e-10.test.ts` and its cross-platform helpers — CA-01/CA-05/CA-07 and shell execution; T14 — enforced link-scenario execution.

## Work

- [x] T16.1 Confirm T12–T15 are complete and all local gates are green, then identify the immutable revision to validate; record the exact SHA and clean/dirty state.
- [x] T16.2 With explicit authorization, run the Node/platform matrix from that revision using `.github/workflows/ci.yml` or an equivalent recorded runner setup. Under `DEC-01`, six cells ran (Ubuntu on WSL 2 and Windows × Node 20/22/24); the macOS cells are waived.
- [x] T16.3 Inspect every executed job for complete gate execution and retain per-platform E2E-10 output proving CA-01, CA-05, and CA-07 ran; retain separate Windows PowerShell and Git Bash evidence. Under `DEC-01`, six jobs were inspected; no macOS job exists.
- [x] T16.4 Record evidence locations, revision, runner details, shell variants, timestamps, and outcomes in the Handoff, and name every cell that was not executed. Under `DEC-01`, the three macOS cells are named as waived.

> Superseded by `DEC-01` (2026-09-14), original T16.2 wording: "With explicit repository/CI authorization in place, run the 3×3 Node/platform matrix from that revision using `.github/workflows/ci.yml` or an equivalent recorded runner setup."
> Superseded by `DEC-01` (2026-09-14), original T16.3 wording: "Inspect all nine jobs for complete gate execution and retain per-platform E2E-10 output proving CA-01, CA-05, and CA-07 ran; retain separate Windows PowerShell and Git Bash evidence."
> Superseded by `DEC-01` (2026-09-14), original T16.4 wording: "Record job URLs or durable artifacts, revision, runner details, shell variants, timestamps, and outcomes in the Handoff; leave the task pending and name every missing cell if evidence is incomplete."

> HIL closure (2026-09-14): the product owner has no macOS machine and no Linux environment other than WSL 2, and decided to close T16 with the available evidence plus a recorded observation. T16.2 and T16.3 cover six of the nine cells: Ubuntu × Node 20/22/24 on WSL 2, and Windows × Node 20/22/24 locally, both as equivalent recorded runners from revision `58082e5`. The three macOS cells were not executed. They are closed as an observation, not as passing evidence: the acceptance criteria that name macOS are waived by this decision, not met. The governing decision is `DEC-01` in the TechSpec.

> State reconciliation (`codereview_06/CR-02`, T24, 2026-09-14): statements that required nine cells, macOS execution, or a pending or open state are kept verbatim above and below as lines labeled "Superseded by `DEC-01`" or "Historical", each next to the current `DEC-01` state. Handoff `Checks` and `Validated state` are unchanged.

## Acceptance criteria

- Under `DEC-01`: all six executed combinations of Node 20/22/24 on Ubuntu (WSL 2) and Windows pass from one immutable corrected revision. The three macOS combinations are waived and not run.
- Each required runner executes E2E-10 CA-01, CA-05, and CA-07 without a silent link-capability return; Windows evidence covers both PowerShell and Git Bash.
- The recorded SHA matches the source used by every executed job, and the Handoff provides reviewable evidence locations plus runner and timestamp metadata.
- No result is inferred from YAML configuration alone.

> Superseded by `DEC-01` (2026-09-14): "All nine combinations of Node 20/22/24 and Ubuntu/macOS/Windows pass from one immutable corrected revision."
> Superseded by `DEC-01` (2026-09-14): "The recorded SHA matches the source used by every job, and the Handoff provides durable, reviewable references plus runner and timestamp metadata."
> Superseded by `DEC-01` (2026-09-14): "No result is inferred from YAML configuration alone; missing infrastructure or authorization leaves the task explicitly pending."

## Verification

- Unit: not applicable; T16 validates previously tested code.
- Integration: included in every executed job through `npm test` and `npm run coverage`.
- End-to-end: under `DEC-01`, E2E-10 executes CA-01, CA-05, and CA-07 on Linux (WSL 2) and Windows; Windows uses PowerShell and Git Bash variants.
- Manual: verify the immutable SHA and inspect every executed job log for actual E2E-10 execution and absence of required skips.
- Platforms under `DEC-01`: Ubuntu (WSL 2) and Windows × Node 20, 22, and 24; Windows PowerShell and Git Bash. macOS is waived.

> Superseded by `DEC-01` (2026-09-14): "End-to-end: E2E-10 executes CA-01, CA-05, and CA-07 on Linux, macOS, and Windows; Windows uses PowerShell and Git Bash variants."
> Superseded by `DEC-01` (2026-09-14): "Platforms: Ubuntu, macOS, and Windows × Node 20, 22, and 24; Windows PowerShell and Git Bash."
> Historical (`codereview_04` planning, superseded by `DEC-01`): "Environment dependency: **PENDING** — the current repository has zero commits, no `HEAD`, no remote, and no CI run artifact. Execution requires explicit authority and access to create/use an immutable revision and multi-platform runners."
> Historical (`codereview_05` planning, superseded by `DEC-01`): "Environment update: still PENDING." At that point only the local initial commit `8401e7f` existed, with no remote, and it predated T17–T22. WSL 2 Ubuntu 26.04 (kernel `6.18.33.2-microsoft-standard-WSL2`) with nvm v0.40.7 and Node 20.20.2, 22.23.2, and 24.21.0 was available. Its PATH included 50 Windows `/mnt` entries, so Linux runs had to strip them and clone the SHA into the Linux filesystem. Whether a SHA-bound WSL log counted as a durable equivalent recorded run was still an open HIL question. No macOS runner and no Windows runs on Node 20 and 22 were available.

- Environment dependency (current, `DEC-01`): closed. Revision `58082e5` exists locally without a remote; WSL 2 Ubuntu and Windows served as equivalent recorded runners, with `/mnt` entries stripped from the WSL PATH; no macOS runner is required.
- Commands: `npm ci --ignore-scripts`, `npm run schemas:check`, `npm run dependencies:check`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run package:smoke` in every executed job.
- Expected evidence (current, `DEC-01`): six green, SHA-bound job records; E2E-10 case output for each executed platform; Windows shell-variant output; no required link skips.

> Superseded by `DEC-01` (2026-09-14): "Expected evidence: nine green, SHA-bound job records; E2E-10 case output for each platform; Windows shell-variant output; no required link skips."

## Affected files

- Modify: this task's state text and Handoff (evidence recorded by `sdd-execute-corrections`; `DEC-01` reconciliation by T24).
- Create: no repository artifact; evidence logs live outside the repository (see Handoff).

> Superseded by `DEC-01` (2026-09-14): "Modify: this task's Handoff only after external evidence exists." and "Create: external CI run records/artifacts; no new repository artifact is required."

## Observability and recovery

- Operational signal: one SHA maps to every executed cell's log and hash, and each log shows E2E-10 execution.
- Recovery: a failed executed job reopens T16 for that cell, to be rerun against the same SHA. The macOS cells stay waived under `DEC-01` and are never reported as passed.

> Superseded by `DEC-01` (2026-09-14): "Operational signal: immutable job URLs/artifact IDs map one SHA to all matrix cells and show E2E-10 execution." and "Recovery: failed or incomplete jobs leave T16 pending with exact missing evidence; rerun the same SHA after correcting runner infrastructure, never relabel a partial run as complete."

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Closed by HIL decision on 2026-09-14. Six of the nine matrix cells passed from one immutable revision: Ubuntu × Node 20/22/24 on WSL 2, and Windows × Node 20/22/24 locally, both as equivalent recorded runners. The three macOS cells were not executed and are recorded as an observation, not as passing evidence.
- Changed files: none. Runs used clean clones of the revision, and the logs are kept outside the repository.
- Checks:
  - Revision: `58082e52d0768414196f598f276e31a07a9d4ebc`, which contains T12–T15 and T17–T22. It was cloned with 0 dirty entries into WSL `~/cb-t16` and into Windows `%TEMP%\cb-t16-win`; the Windows clone also had 0 dirty entries after every job.
  - Every job ran with `CI=true`, followed the `.github/workflows/ci.yml` step order, and would have stopped at the first failure: `npm ci --ignore-scripts`, `npm run schemas:check`, `npm run dependencies:check`, `npm run build`, `npm run typecheck`, `npm run lint`, tests (`npx vitest run --reporter=verbose`, the runner behind `npm test`), `npm run coverage`, `npm run package:smoke`.
  - Linux runner: WSL 2 Ubuntu 26.04 LTS, kernel `6.18.33.2-microsoft-standard-WSL2`, nvm-managed Node, PATH with 0 `/mnt` entries.
    - Node 20.20.2 (npm 10.8.2), 2026-09-14T15:29:01Z–15:30:02Z: all steps exited 0; 218/218 tests, none failed or skipped; coverage 91.2 / 82.87 / 96.17 / 91.2.
    - Node 22.23.2 (npm 10.9.8), 15:30:03Z–15:30:57Z: all steps exited 0; 218/218 tests; coverage 91.2 / 82.87 / 96.17 / 91.2.
    - Node 24.21.0 (npm 11.19.0), 15:30:58Z–15:31:48Z: all steps exited 0; 218/218 tests; coverage 91.34 / 82.85 / 96.15 / 91.34.
    - E2E-10 in every Linux job: CA-01, CA-05, and CA-07 passed in the `bash` (launches `/bin/sh`) and `native` variants.
    - Logs: `~/t16-evidence/58082e52d0768414196f598f276e31a07a9d4ebc/node{20,22,24}/*.log` plus `summary.txt`. Test log SHA-256: node20 `457f405864f90714…`, node22 `09cf572645da91ff…`, node24 `bc688e476f73c48f…`.
  - Windows runner: Windows 11 Pro (NT 10.0.26200), Git Bash 5.3.15. Node 20 and 22 came from the official portable zips, verified against nodejs.org `SHASUMS256.txt` and placed first on PATH only for their job; Node 24 is the installed runtime.
    - Node 20.20.2 (npm 10.8.2), 2026-09-14T15:58:27Z–16:00:14Z: all steps exited 0; 218/218 tests, none failed or skipped; coverage 91.2 / 82.84 / 96.17 / 91.2.
    - Node 22.23.2 (npm 10.9.8), 16:00:29Z–16:02:13Z: all steps exited 0; 218/218 tests; coverage 91.2 / 82.85 / 96.17 / 91.2.
    - Node 24.19.0 (npm 11.17.0), 16:02:26Z–16:03:52Z: all steps exited 0; 218/218 tests; coverage 91.34 / 82.84 / 96.15 / 91.34.
    - E2E-10 in every Windows job: CA-01, CA-05, and CA-07 passed in both the Windows PowerShell and Git Bash variants.
    - Logs: `%TEMP%\t16-evidence-win\58082e52d0768414196f598f276e31a07a9d4ebc\node{20,22,24}\*.log` plus `summary-node{20,22,24}.txt`. Test log SHA-256: node20 `fb7daab7be99c9ca…`, node22 `488d65b65c42e3a5…`, node24 `6b6cf02d4bc74e7b…`.
  - No required link scenario skipped in any job; with `CI=true`, an unavailable link capability would have failed the job.
- Validated state: revision `58082e5`; Ubuntu (WSL 2) and Windows × Node 20, 22, and 24; the macOS cells were not executed.
- Open items and observations:
  - HIL decision recorded and formalized: macOS and Linux distributions other than WSL 2 Ubuntu are not verifiable with the available infrastructure. The exception is recorded in PRD CA-20 and TechSpec `DEC-01`, and `codereview_06` accepts CA-20 as conformant by `DEC-01`.
  - HIL decision recorded: the WSL 2 and Windows runs are accepted as equivalent recorded runners instead of CI job URLs. The evidence exists only on this machine, and the Windows copy lives under `%TEMP%`, which the operating system may clean.
  - Test-suite repeatability, including the IT-14 zero-sample result and the benchmark-heavy E2E timeouts carried from T19, is now tracked as `codereview_06/CR-01` (T23).
  - OBS-01 and OBS-02 were resolved by T18, and `codereview_06` records them as resolved.
