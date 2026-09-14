# Preparatory refactoring

Measures the terrain where the feature will land and decides whether it needs preparing first. Fowler: *make the change easy, then make the easy change*. The question is not whether the existing code is bad, but whether **this** change becomes more expensive or riskier because of it. Code the feature only reads is not this feature's problem.

The measurement also produces the **baseline**: the quality profile hits that already existed in the target files. Without it, every downstream gate blames the task for the debt it found, noise becomes routine, and the whole profile ends up ignored.

## Measures

Scoped to the files in the **Relevant files** section, never to the repository. Run from a POSIX shell (Git Bash on Windows), and skip a command when `targets` is empty, because `rg` without paths searches the whole repository.

```bash
targets=()   # existing files the feature will modify
rg -c -H '^' "${targets[@]}"
rg -c -H --type ts '^export (default )?(declare )?(async )?(function|class|const|let|interface|type|enum)\b' "${targets[@]}"
rg -n -H --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{|=>)' "${targets[@]}"
rg -c -H --type ts '^\s*case ' "${targets[@]}"
```

| Measure | Structural threshold |
| --- | --- |
| File lines | above 100 (`.agents/rules/code-standards.md`) |
| Exported members | 10+ |
| Parameters in one declaration | 4+ |
| Cases in a `switch` or `if` chain over the same value | 10+ |

Also run the quality profile commands (`quality-typescript.md`) over the same files: the result is the baseline, not a list of defects to fix. A file the feature creates has no baseline row and starts clean.

## Decision

A crossed threshold is not enough. Debt matters when the feature **touches it**:

- **(a) Structural** — the target file crosses at least one threshold above.
- **(b) Contact** — the feature modifies that file in three or more distinct places, **or** extends exactly the saturated structure: one more case in the `switch` that already has ten, one more parameter in a function that already has three, one more export in a module that already has ten.

| Situation | Destination |
| --- | --- |
| Only (a) | **Record** in the baseline and move on. The debt exists but does not hinder this change. |
| Only (b) | Nothing to do: intense contact with a healthy file is normal work. |
| (a) **and** (b) | **Recommend** preparatory refactoring, unless absorption fits. |

**Absorb** instead of recommending when the preparation is local and fits within the feature itself: extract a function, introduce a parameter object, isolate a dependency behind a port. The test is threefold — it does not change the public contract, does not require new characterization tests, and fits in one feature task. Record it as `DEC-NN` and handle it during implementation.

**Recommend** when the preparation changes a contract, requires characterization before mutating, or crosses several files. Name the minimal scope that makes the change easy — not the ideal refactoring of the file. A recommendation that rewrites the whole module is rightly refused; one that extracts the responsibility the feature will touch is accepted.

The recommendation is presented at the technical HIL and never blocks on its own. Approved, `sdd-plan-refactoring` generates the artifacts and the refactoring precedes the feature; refused, it becomes a risk recorded in the TechSpec and the baseline still applies.

## Recording

Fill in **Terrain baseline** in the template's Quality profile section: one item per existing target file, with measures, pre-existing hits, and destination. A target file without a row in the baseline is an unmeasured file — the downstream gate will treat every hit in it as new.

The baseline describes a state of the code, so it survives only as long as that state lasts. When a preparatory refactoring is approved and executed, remeasure the target files and rewrite the baseline before replanning the feature's tasks: keeping the old baseline would forgive hits the refactoring already eliminated. An external change to the target between the TechSpec and implementation has the same effect and calls for the same remeasurement.
