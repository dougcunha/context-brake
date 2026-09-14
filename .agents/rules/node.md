---
paths:
  - "src/**/*.ts"
  - "package.json"
  - "package-lock.json"
---

# Node.js Rules

These rules apply to ContextBrake code that runs on Node.js: the CLI, hooks that a harness runs as one process per event, and plugins and extensions loaded inside the harness process.

## Asynchronous Code

Use `async/await` and avoid nested callbacks. Propagate errors with `throw` when the current layer lacks the context to handle them.

## Do Not Block the Harness Process

OpenCode plugins and Pi and Oh-My-Pi extensions run inside the harness process. There, never use synchronous I/O such as `readFileSync`, `writeFileSync`, or `execSync`, and never run long computations.

In hooks that run as one process per event, startup dominates the cost. Import heavy modules, such as tokenizers, only on the code path that needs them:

```ts
async function estimateTokens(text: string): Promise<number> {
  const { countTokens } = await import('./tokenizer.js');
  return countTokens(text);
}
```

## Stdout Belongs to the Harness

In hooks, stdout is the response channel to the harness: write only the JSON or text the harness expects, once per invocation. Logs and diagnostics go to stderr or to the local log. A stray `console.log` on the hook path corrupts the response.

## Child Processes

- Start processes with `execFile` or `spawn` and an argument array. Never build a shell command string from paths, harness payloads, or configuration values.
- The validation commands in `task_plan.json` are the only shell strings ContextBrake executes, and only the runner runs them, after the confirmation required by the runner PRD.
- Give every child process a timeout, and stop it and its children when the timeout expires.

## Paths and Platforms

- Build paths with `node:path` and resolve user-level directories with `os.homedir()`; never hardcode separators or home paths.
- Compare paths after resolving them with `realpath`, without assuming the file system is case-sensitive or case-insensitive.
- Code that creates, changes, or removes user files also follows `file-changes.md`.

## Configuration

ContextBrake does not use `.env` files. Configuration comes from `context-brake.config.json` and is validated at startup, before any write. Environment variables defined by a harness are read only inside that harness's adapter.

## Shutdown

Long-running commands, such as `run` and the `doctor` overhead measurement, handle `SIGINT` and `SIGTERM`: they stop child processes, leave the plan and checkpoint valid, and exit with the matching exit code. Repeated signals never start a second shutdown.

## Logging

Use `console.log` and `console.error` only inside the logging adapter, which never writes to stdout in hook mode. Log useful context such as session, harness, tool, zone, and duration.

## Dependencies and Lock File

- Prefer Node.js built-in modules, imported with the `node:` prefix. Add a runtime dependency only when it removes real complexity, and keep heavy dependencies off hook code paths.
- Runtime dependencies must not run install scripts.
- Use npm only: `npm install <package>` or `npm install --save-dev <package>`. Commit `package-lock.json`, use `npm ci` in CI, and never delete the lock file to resolve conflicts.
