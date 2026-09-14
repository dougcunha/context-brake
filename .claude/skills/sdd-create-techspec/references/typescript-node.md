# TypeScript and Node.js profile

Record the profile in the TechSpec so planning, execution, and review reuse the discovery.

- Identify the affected modules and their runtime surface from repository files: a CLI command in `src/cli/`, a hook run as one process per event, or a plugin or extension loaded inside the harness process. The surface decides the performance budget and which parts of `.agents/rules/node.md` apply.
- Record the Node.js version, TypeScript configuration, module format, and test runner from `package.json`, `tsconfig.json`, and `vitest.config.*`. Take build, typecheck, lint, test, and coverage commands from the Commands section of `AGENTS.md`; when a command is missing there, record the gap instead of inventing one.
- Unit tests cover `core` with port fakes; integration tests exercise adapters against a temporary filesystem, a temporary git repository, and harness fixtures; end-to-end tests run the built CLI as a child process against fixture repositories. There is no browser or UI automation. Follow `.agents/rules/tests.md` for layers, required scenarios, coverage, and the platform matrix.
- Harness behavior comes from `docs/research/harness-integrations.md`. Cover each affected harness with payload and configuration fixtures derived from the documented format; a fake that does not follow that format does not prove the harness contract. Record undocumented behavior as a gap.
- When the diff touches paths, symbolic links, line endings, or child processes, specify checks on Linux, macOS, and Windows, or record which platforms stay unverified.
- Check the test count and the exit code; zero tests or a listing do not prove acceptance. Serialize validations that share `dist/`, `coverage/`, or fixture directories.

The profile must contain evidence of the runtime surfaces, commands, fixtures, platform coverage, prerequisites, and covered obligations.
