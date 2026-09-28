# jev pilot summary — prd-08-modo-debug

- Mode: `shadow` (`DEC-HIL-00`). No verdict changed a stage, gate, or artifact.
- Control: both reviews (`codereview_01`, `codereview_02`) ran in the same harness session ID as the authoring sessions. Each ran after `/clear`, in a context that wrote no feature code, and neither opened `jev-log.jsonl` before writing its report. The log therefore records them as `reviewing` without `control: absent`. The counts below treat them as a control group; with a stricter reading of "authoring session", only items 4 and 5 would count.
- Source: `jev-log.jsonl` (11 lines; the probe of this session is noted on the last line), `done/task_0{1,2}.md`, `codereview_01/done/task_03.md`, `codereview_01/codereview.md`, `codereview_02/codereview.md`.

## 1. Task gate (J3) against the first review

`codereview_01` findings, assigned to tasks and criteria:

- `CR-01` (missing assertions). Parts (1) disable preview and (3) extra-line drift belong to T01 (TC-08, TC-09). Part (2), doctor absence in light mode, belongs to T02, criterion 1.
- `CR-02` (line budgets). T01 owns `installation-service.ts` and `brake-engine.ts`; T02 owns `doctor-service.ts` and `report-service.ts`.

| Gate | Counted | safe_to_apply | composite | Classification |
| --- | --- | --- | --- | --- |
| task_01 | no: `operational-failure` (literal diff not sent, to protect context) | — | — | out of counts; T01's parts of CR-01 and CR-02 cannot be judged |
| task_02, first call | no: `operational-failure` (input not per J3) | 0.78 | 0.832 | out of counts |
| task_02, rerun | yes | 0.78 | 0.832 | Criterion 1 (C1 0.82, verified at auto) with `CR-01` part (2): **miss**. Quality-profile claim (0.71, below auto) with `CR-02` on the T02 files: **hit (weak)**, because CR-02 is a TechSpec line budget, not a QA-07 hit. Rubric `escalate` on `blast_radius`: **unspecific signal** |
| codereview_01/task_03 | yes | 0.69 | 0.933 | Criterion 3 (0.77, below auto), with no finding in `codereview_02`: **false alarm** |

Totals: 1 hit (weak), 1 miss, 1 false alarm, 0 hits confirmed by the author, 1 unspecific signal; 2 of 5 gate calls excluded as operational failures.

## 2. Coverage (J1, J2)

- J1 (PRD → TechSpec): 8/8 verified at auto (min 0.88); no gaps flagged.
- J2 (TechSpec → tasks): all obligations verified at auto (min 0.89); no gaps flagged.
- Confirmed by the human or the review: 0 flagged, 0 confirmed. The review found one test-assertion gap without a flag (`codereview_01/CR-01`). Both J2 and the plan counted TC-08/TC-09 as covering FR-06, but they did not cover disabling or the extra-line direction.

## 3. Review (J4, J5, J6)

| Point | Unit | Agreement | Divergences |
| --- | --- | --- | --- |
| J4 | codereview_01 | 8 of 9 rows agree, 1 partial | NFR-02: 0.51/0.25/0.24 tie vs reviewer "conformant (Windows); Linux and macOS not verifiable" |
| J4 | codereview_02 | 8 of 9 rows agree, 1 partial | NFR-02: contradicts 0.52 / supports 0.33 (confidence 0.29, `review`) vs the same reviewer state |
| J5 | codereview_01 | 2 of 2 severities agree (`reservation`) | none (CR-01 at 0.58, below auto) |
| J5 | codereview_02 | not run (no findings) | — |
| J6 | codereview_01 | 2 of 2 destinations agree | none |
| J7 | reservations HIL | agreed with the human answer (0.91) | none |

In both reviews, the manual-acceptance row came back `contradicted`, which maps to `not verifiable` and matches the reviewer.

## 4. Flow

- First review: `APPROVED WITH RESERVATIONS` (`codereview_01`, 2 Low findings).
- Rounds until `APPROVED`: 1 correction round, limited to `CR-01` by `DEC-HIL-13`, then `codereview_02` returned `APPROVED`.
- Reopened tasks: 0. Accepted open item: `codereview_01/CR-02`.

## 5. Cost

| Point | Calls | Input tokens | Output tokens |
| --- | --- | --- | --- |
| J1 | 1 | 4,895 | 949 |
| J2 | 1 | 4,565 | 1,107 |
| J3 | 4 (1 not called) | 22,318 | 1,154 |
| J4 | 2 | 11,813 | 1,661 |
| J5 | 1 | 1,079 | 99 |
| J6 | 1 | 782 | 99 |
| J7 | 1 | 2,358 | 464 |
| Probe (`jev_noul`, this session) | 1 | 363 | 25 |
| **Total** | 12 | **48,173** | **5,558** |

- Probes in earlier sessions and the triage `jev_decide` (`tasks/triage-log.jsonl`) did not record usage in this log.
- Duration: unmeasured. The host exposes no per-call timing; the log spans 11:01 to 13:09 on 2026-09-28.

## 6. Baseline

Earlier features in this repository ran without jev (10 features, 34 reviews):

- First review `REJECTED`: 7 of 10 (`prd-01`, `prd-01.1`, `prd-02.2`, `prd-03`, `prd-04`, `prd-06`, `prd-07`).
- Average reviews per feature: 3.4, or 2.4 rounds after the first. Excluding the two outliers `prd-01` and `prd-02`, with 9 reviews each: 2.0 reviews, 1.0 round.
- This feature: first review not rejected, 2 reviews, 1 round.

Limitations: the pilot is one small `sdd-lean` feature, compared with larger `sdd-full` baselines, and in `shadow` jev could not change the outcome. The flow difference therefore reflects feature size, not jev. The J3 sample has two usable gates.

## Reading

- J1 and J2 passed everything and still missed the one real gap: a direction of FR-06 (disabling, extra line) that had no test. The coverage claims were too coarse to catch it.
- In this pilot, J3 gave no reliable signal: one miss, one weak hit, one false alarm, and two operational failures, one of them caused by context cost.
- J4 to J7 agreed with the reviewer and the human on every decision. The only repeated divergence is NFR-02, where the evidence says Linux and macOS were not run locally.
- Adopting any point in `active`, or turning the mode off, is a human decision recorded in `workflow.md`.
