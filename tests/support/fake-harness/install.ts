import { chmod, writeFile } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import process from 'node:process';

export const FAKE_HARNESS_SCRIPT = resolve('tests', 'support', 'fake-harness', 'fake-harness.mjs');
export const FAKE_HARNESS_ENTRYPOINTS = ['claude', 'codex'] as const;

export type FakeSession = {
  readonly sessionId?: string;
  readonly finalText?: string;
  readonly tokens?: number;
  readonly failure?: string;
  readonly exitCode?: number;
  readonly noise?: readonly string[];
  readonly hang?: { readonly pidFile?: string; readonly readyFile?: string; readonly ignoreChildInterrupt?: boolean; readonly exitLeader?: boolean };
  readonly ignoreInterrupt?: boolean;
  readonly work?: boolean;
  readonly markComplete?: boolean;
  readonly checkpoint?: boolean;
  readonly toolCharacters?: number;
  readonly wrap?: { readonly argv: readonly string[]; readonly output: string };
};

export type FakeScenario = FakeSession & {
  readonly record?: string;
  readonly journal?: string;
  readonly counter?: string;
  readonly sessions?: readonly FakeSession[];
};

export async function installFakeHarness(binDirectory: string): Promise<void> {
  for (const name of FAKE_HARNESS_ENTRYPOINTS) {
    if (process.platform === 'win32') {
      await writeFile(join(binDirectory, `${name}.cmd`), `@"${process.execPath}" "${FAKE_HARNESS_SCRIPT}" ${name} %*\r\n`, 'utf8');
    } else {
      const path = join(binDirectory, name);
      await writeFile(path, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_HARNESS_SCRIPT}" ${name} "$@"\n`, 'utf8');
      await chmod(path, 0o755);
    }
  }
}

export function pathVariable(): string {
  return Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
}

export function fakeHarnessEnvironment(binDirectory: string, scenarioPath: string): Record<string, string> {
  const key = pathVariable();
  return { [key]: `${binDirectory}${delimiter}${process.env[key] ?? ''}`, FAKE_HARNESS_SCENARIO: scenarioPath };
}

export async function writeScenario(path: string, scenario: FakeScenario): Promise<void> {
  await writeFile(path, JSON.stringify(scenario), 'utf8');
}
