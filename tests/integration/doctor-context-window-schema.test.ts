import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDoctor } from '../../src/cli/commands/doctor.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';

const COMMAND = 'node "/repo/.claude/hooks/context-brake-statusline.mjs"';
type PublishedSchema = { readonly properties: { readonly schemaVersion: { readonly const: number }; readonly contextWindow?: unknown }; readonly required: readonly string[] };

let root = '';
let stdout: string[] = [];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-doctor-window-'));
  stdout = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.context-brake', 'runtime'), { recursive: true });
  await writeFile(join(root, '.claude', 'settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(root, '.claude', 'settings.local.json'), JSON.stringify({ statusLine: { type: 'command', command: COMMAND } }), 'utf8');
  await writeFile(join(root, '.context-brake', 'runtime', 'claude-statusline.json'), JSON.stringify({ v: 1, installedCommand: COMMAND, previousLocal: null, previousSource: null, previousCommand: null, createdLocalFile: true }), 'utf8');
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('doctor --json with the context window section (NFR-04, DEC-10, TC-18)', () => {
  it('emits a report that matches the doctor schema at version 1', async () => {
    await runDoctor({ command: 'doctor', json: true, harness: ['claude-code'] }, { projectRoot: root });
    const report = doctorReportSchema.parse(JSON.parse(stdout.join('')));
    expect(report.schemaVersion).toBe(1);
    expect(report.contextWindow).toEqual({ bridge: 'installed', source: 'contextWindowCeiling', lastWindowTokens: null });
  });

  it('publishes contextWindow as an optional property of the version 1 schema', async () => {
    const schema = JSON.parse(await readFile('schemas/doctor-report.schema.json', 'utf8')) as PublishedSchema;
    expect(schema.properties.schemaVersion.const).toBe(1);
    expect(schema.properties.contextWindow).toBeDefined();
    expect(schema.required).not.toContain('contextWindow');
  });
});
