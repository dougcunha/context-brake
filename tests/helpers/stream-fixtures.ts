import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SessionLauncher, SessionStreamEvent } from '../../src/core/contracts/run-ports.js';

export type ParsedStream = { readonly events: readonly SessionStreamEvent[]; readonly unparsedLines: number };

export async function parseStreamFixture(launcher: SessionLauncher, harness: string, file: string): Promise<ParsedStream> {
  const source = await readFile(resolve('tests', 'fixtures', 'harnesses', harness, file), 'utf8');
  const events: SessionStreamEvent[] = [];
  let unparsedLines = 0;
  for (const line of source.split(/\r?\n/).filter((entry) => entry.trim() !== '')) {
    try {
      events.push(...launcher.parseLine(line));
    } catch {
      unparsedLines += 1;
    }
  }
  return { events, unparsedLines };
}

export const PERMISSION_FLAG_PATTERN = /permission|sandbox|dangerously|bypass|allowedtools|full-auto|yolo/i;
