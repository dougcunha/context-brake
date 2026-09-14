# QA report — [feature name]

## Summary

- Status: APPROVED / REJECTED / BLOCKED
- Code state: `[commit or diff reference]`
- Latest review: `codereview_[num]/codereview.md`
- Previous QA: `[path or —]`

## Environment

| Item | Value |
| --- | --- |
| Node.js | [version] |
| Platforms | [platforms that ran, and platforms that could not run] |
| Build command | `[command from AGENTS.md]` |
| Fixtures | `[tests/fixtures/... paths]` |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-01, TC-04 | end-to-end/unit/integration/manual | PASSED/FAILED/NOT VERIFIABLE | `qa_[num]/evidence/[file]` |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-01 | `[fixture]` | `[command]` | [code] | PASSED/FAILED | `[path]` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| [script] | [person or agent] | [result] | PASSED/FAILED/NOT VERIFIABLE |

## Findings

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | Critical/High/Medium/Low | [ID] | `[command]` | [expected result] | [actual result] | `[path]` |

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| qa_[previous]/BUG-01 | resolved/persistent/not verifiable | [evidence] |

## Limitations and open items

- [missing environment, platform, or decision, with affected obligations]

## Conclusion

[Opinion derived from the checklist, runs, and findings.]
