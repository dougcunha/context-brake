#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCliArgs, CliArgumentError } from './argument-parser.js';
import { dispatchCommand } from './composition-root.js';
import { buildCliErrorDocument } from '../core/services/report-service.js';
import { renderJsonOutput } from './output/json.js';
import { renderCliErrorText } from './output/text.js';
import { SHUTDOWN_SIGNALS, signalRouter } from './shutdown.js';

let signalRegistered = false;

function setupSignalHandlers(): void {
  if (signalRegistered) return;
  signalRegistered = true;
  for (const signal of SHUTDOWN_SIGNALS) process.on(signal, () => signalRouter.handle(signal));
}

function handleParseError(err: CliArgumentError, argsList: readonly string[]): number {
  const isJson = argsList.includes('--json');
  const first = argsList[0];
  const cmd = first === 'doctor' || first === 'remove' || first === 'plan' || first === 'wrap' || first === 'run' ? first : 'init';
  const doc = buildCliErrorDocument({ command: cmd, code: 'INVALID_ARGUMENTS', message: err.message });
  if (isJson) {
    renderJsonOutput(doc);
  } else {
    renderCliErrorText(doc);
  }
  return doc.exitCode;
}

export async function main(argumentsList: readonly string[] = process.argv.slice(2)): Promise<number> {
  setupSignalHandlers();
  try {
    const parsed = parseCliArgs(argumentsList);
    const projectRoot = await realpath(process.cwd()).catch(() => process.cwd());
    const env = { projectRoot };
    return await dispatchCommand(parsed, env);
  } catch (err) {
    if (err instanceof CliArgumentError) return handleParseError(err, argumentsList);
    const isJson = argumentsList.includes('--json');
    const msg = err instanceof Error ? err.message : String(err);
    const doc = buildCliErrorDocument({ command: 'init', code: 'UNEXPECTED_ERROR', message: msg });
    if (isJson) {
      renderJsonOutput(doc);
    } else {
      renderCliErrorText(doc);
    }
    return doc.exitCode;
  }
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  if (import.meta.url === pathToFileURL(resolve(entrypoint)).href) return true;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entrypoint)).href;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  main().then((code) => { process.exitCode = code; });
}
