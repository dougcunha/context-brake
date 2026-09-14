# CLI and harness adapters

Read this reference only when the refactoring target includes harness adapters, hook entrypoints, code that edits user files, or CLI output.

- Characterize each hook response before changing its producer: record the input payload and the exact output the harness receives, per harness, as fixtures in `tests/fixtures/harnesses/<harness>/`.
- Characterize user-file changes with fixture repositories copied to a temporary directory: assert the change plan and the resulting bytes, including content ContextBrake does not own, line endings, and symbolic links.
- Treat the telemetry block, block message, boot summary, `--json` output, and exit codes as contracts. A refactoring that changes any of them is not behavior-preserving and needs a product decision.
- Cover each adapter's failure policy, below and above the critical ceiling, with tests before moving error handling.
- Run characterization on Linux, macOS, and Windows when the target handles paths, links, line endings, or child processes.
- Preserve the hexagonal boundaries in `AGENTS.md`: moving code between `core`, `infrastructure`, and `cli` is structural, but a new dependency from `core` outward is a regression.
