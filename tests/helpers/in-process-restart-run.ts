import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

export type RestartLogFile = { readonly componentVersion: string; readonly records: readonly { readonly code: string }[] };

export type RestartRun = {
  start(): Promise<void>;
  signal(tools?: number): Promise<void>;
  ownPrompt(): Promise<void>;
  type(): Promise<void>;
  setMode(mode: string): void;
  sessions(): number;
  seeds(): readonly string[];
  log(): Promise<RestartLogFile | null>;
};

export async function writeConfig(root: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const config = { ...DEFAULT_CONFIG, snapshot: { ...DEFAULT_CONFIG.snapshot, command: '/sdd-snapshot' }, autoRestart: { maxConsecutiveRestarts: 2 }, ...overrides };
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

export async function readRestartLog(root: string, harness: string, sessionId: string): Promise<RestartLogFile | null> {
  const text = await readFile(join(root, '.context-brake/runtime/restart', harness, `${sessionId}.json`), 'utf8').catch(() => null);
  return text === null ? null : JSON.parse(text) as RestartLogFile;
}

export async function codesOf(run: RestartRun): Promise<string[] | null> {
  return (await run.log())?.records.map((record) => record.code) ?? null;
}
