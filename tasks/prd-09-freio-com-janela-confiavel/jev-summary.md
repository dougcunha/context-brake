# jev pilot summary — prd-09-freio-com-janela-confiavel

- Mode: `shadow` (`DEC-HIL-00`). No verdict changed a stage, gate, or artifact.
- Control: `delegated`. All three reviews (`codereview_01`, `codereview_02`, `codereview_03`) ran in fresh-context delegated reviewers that did not open `jev-log.jsonl` before writing their reports; their lines carry `control: delegated`.
- Source: `jev-log.jsonl` (17 lines; line 14 corrects the `effect` of line 13 and is not counted twice), `done/task_0{1,2}.md`, `codereview_01/done/task_0{3,4}.md`, `codereview_02/done/task_05.md`, `codereview_0{1,2,3}/codereview.md`.

## 1. Task gate (J3) against the first review

`codereview_01` findings, assigned to tasks and criteria:

- `CR-01` (DEC-08: a plain `init` fails on an unparseable `.claude/settings.local.json`): T02, TC-09.
- `CR-02` (FR-04/FR-08: README and capability text still call the bridge optional): T02, TC-14 and the docs criterion.

| Gate | Counted | safe_to_apply | composite | Classification |
| --- | --- | --- | --- | --- |
| task_01 | no: `operational-failure` (literal diff about 116,000 characters, above the 50,000 limit, not sent) | — | — | out of counts |
| task_02 | no: `operational-failure` (literal diff about 56,000 characters, not sent) | — | — | out of counts; both `codereview_01` findings belong to this task and cannot be judged |

No first-review gate was counted: hits 0, false alarms 0, misses 0.

Correction-round gates (outside the `codereview_1` metric, listed for calibration):

| Gate | safe_to_apply | composite | Flags and later review |
| --- | --- | --- | --- |
| codereview_01/task_03 | 0.29 | 0.650 | Criterion 4 (full suite) `contradicted` 0.98: correct, the first full run had one e2e timeout; the task stayed at the root until a green run. Other claims below auto; `codereview_02` confirmed CR-01 resolved |
| codereview_01/task_04 | 0.61 | 0.775 | Criteria 2 and claim 4 below auto; `codereview_02` confirmed CR-02 and the rule text resolved, but found other unconditional README lines (`codereview_02/CR-01`) outside the task's named lines |
| codereview_02/task_05, first call | 0.39 | 0.583 | Criterion 1 `unsupported` 0.32; the author's reread then found `README.md:31` still unconditional and fixed it (`diff-changed`): **hit confirmed by the author** |
| codereview_02/task_05, second call | 0.37 | 0.509 | All claims below auto (criterion 2 `contradicted` at 0.23); `codereview_03` found no finding: **false alarm** on criterion 2, unspecific signal elsewhere |

Every counted gate returned `escalate`; none reached `auto`, including tasks the next review approved.

## 2. Coverage (J1, J2)

- J1 (`techspec.md`): NFR-01 `unsupported` (fixed after the call) and FR-08 below auto. `codereview_01/CR-02` is an FR-08 gap: **confirmed**. The DEC-08 gap (`codereview_01/CR-01`) was not flagged by J1 or J2: **found by the review without a flag**.
- J2 (`tasks.md`): FR-02 below auto and NFR-01 `unsupported`; neither was confirmed by a review finding.

## 3. Review (J4, J5, J6)

- J4 per review (candidate state vs report state): `codereview_01` DEC-08 `contradicted` = non-conformant (agree); FR-08 `contradicted` vs conformant with CR-02 (partial agree); NFR-03 `contradicted` vs not verifiable (divergence, explained by the report: no CI); NFR-01 `review` vs conformant. `codereview_02` FR-08 verified at `review` vs non-conformant (`CR-01`): divergence. `codereview_03` NFR-03 `contradicted` vs not verifiable (same divergence); FR-03, NFR-01, NFR-02 verified at `review` vs conformant (agree).
- J5: `codereview_01` CR-01 and CR-02 `blocking` (`auto`), both drove the `REJECTED` status (agree; CR-02 is Low in the report). `codereview_02` CR-01 `blocking` at `review` (agree with `REJECTED`). `codereview_03` had no finding; J5 did not run.
- J6: 3 of 3 findings `actionable` at `auto`, aligned with the plans.
- J7 (reservations HIL of `codereview_03`): `finalize` 0.61, `correct_b_c` 0.36; agrees with the human answer `DEC-HIL-04`; warned that finalizing leaves the doc qualifiers inconsistent, which the human accepted as item (b).

## 4. Flow

- First review: `REJECTED` (2 findings). Rounds until decided reservations: 3 reviews and 2 correction rounds (tasks T01–T02, then correction tasks T03–T05). No task reopened.
- Final review `codereview_03`: `APPROVED WITH RESERVATIONS`, finalized (`DEC-HIL-04`).

## 5. Cost

| Point | Calls | Input tokens | Output tokens |
| --- | --- | --- | --- |
| J1 | 1 | 7,896 | 1,843 |
| J2 | 1 | 4,937 | 1,295 |
| J3 | 6 (2 not called) | 15,520 | 958 |
| J4 | 3 | 14,129 | 2,750 |
| J5 | 2 | 1,733 | 150 |
| J6 | 2 | 1,730 | 150 |
| J7 | 1 | 2,383 | 461 |
| Total | 16 | 48,328 | 7,607 |

Plus two `jev_noul` probes (363 + 25 tokens in this session; the earlier session's probe was not logged). Per-call duration is not exposed by the host: unmeasured. Wall-clock span of the pilot: 14:48 to 19:09 (-03:00) on 2026-09-28.

## 6. Baseline

Features in this repository without jev (`prd-01` through `prd-07`, including `.1`/`.2` slices; `prd-08` used jev and is excluded): 10 features, 7 with a `REJECTED` first review (70%), 34 reviews in total (mean 3.4, median 2 per feature). This feature: `REJECTED` first review, 3 reviews. Limitation: the sample is small, the features differ in size and level (`sdd-full` vs `sdd-lean`), and `prd-01` and `prd-02` alone account for 18 reviews.

## Reading

In this pilot the task gate never produced a counted first-review measurement: both implementation diffs exceeded the 50,000-character limit, and split calls were not made. In the smaller correction diffs it returned `escalate` every time, including on tasks the next review approved, so its aggregate action carried no signal here; one per-claim flag coincided with a defect the author then fixed. J6 and J7 agreed with the flow's decisions. Adopting any point in `active` is a human decision to record in `workflow.md`.
