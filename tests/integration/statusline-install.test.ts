import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BRIDGE_PATH, createStatuslineWorld, INSTALL, LOCAL_PATH, localStatusline, readWorldFile, removeStatuslineWorld, runJson, STATE_PATH, type InstallReportView, type StatuslineWorld } from '../helpers/statusline-world.js';

const LOCAL_WITH_STATUSLINE = '{\n  // developer overrides\n  "permissions": {\n    "allow": [\n      "Bash(ls)"\n    ]\n  },\n  "statusLine": {\n    "type": "command",\n    "command": "~/.claude/statusline.sh",\n    "padding": 2\n  }\n}\n';

const INVALID_ARGUMENTS_EXIT_CODE = 64;
let world: StatuslineWorld;
function run(argv: readonly string[]): Promise<InstallReportView> { return runJson(world, argv); }
function read(path: string): Promise<string | null> { return readWorldFile(world, path); }
async function exists(path: string): Promise<boolean> { return (await read(path)) !== null; }

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

describe('status line bridge install and restore (FR-01, FR-02, FR-08, DEC-11, TC-12)', () => {
  it('wraps the local status line, stays unchanged on reruns, and restores the file byte for byte', async () => {
    await writeFile(join(world.root, LOCAL_PATH), LOCAL_WITH_STATUSLINE, 'utf8');
    expect((await run(INSTALL)).exitCode).toBe(0);
    expect(localStatusline(await read(LOCAL_PATH))).toEqual({ type: 'command', command: `node "${world.root.replace(/\\/g, '/')}/${BRIDGE_PATH}" --pipe | ( ~/.claude/statusline.sh\n)`, padding: 2 });
    expect(await exists(BRIDGE_PATH)).toBe(true);
    const installed = [await read(LOCAL_PATH), await read(STATE_PATH)];
    await run(INSTALL);
    await run(['init', '--yes', '--json']);
    expect([await read(LOCAL_PATH), await read(STATE_PATH)]).toEqual(installed);
    expect((await run(['init', '--yes', '--json', '--no-statusline-bridge'])).exitCode).toBe(0);
    expect(await read(LOCAL_PATH)).toBe(LOCAL_WITH_STATUSLINE);
    expect(await exists(STATE_PATH)).toBe(false);
    expect(await exists(BRIDGE_PATH)).toBe(true);
  });

  it('does not create a status line without the flag', async () => {
    await run(['init', '--yes', '--json']);
    expect(await exists(LOCAL_PATH)).toBe(false);
    expect(await exists(STATE_PATH)).toBe(false);
  });

  it('lists both files in a dry run without writing them (TC-15)', async () => {
    const report = await run([...INSTALL, '--dry-run']);
    expect(report.plan.changes.map((change) => change.path)).toEqual(expect.arrayContaining([LOCAL_PATH, STATE_PATH]));
    expect(await exists(LOCAL_PATH)).toBe(false);
    expect(await exists(STATE_PATH)).toBe(false);
  });
});

describe('status line bridge removal of a created file (FR-08, TC-13)', () => {
  it('wraps the user status line and deletes the created local file and the state on remove', async () => {
    await mkdir(join(world.home, '.claude'), { recursive: true });
    await writeFile(join(world.home, '.claude', 'settings.json'), '{ "statusLine": { "type": "command", "command": "user.sh", "refreshInterval": 5 } }\n', 'utf8');
    await run(INSTALL);
    expect(localStatusline(await read(LOCAL_PATH))).toMatchObject({ command: expect.stringContaining('--pipe | ( user.sh\n)') as unknown, refreshInterval: 5 });
    expect((await run(['remove', '--yes', '--json'])).exitCode).toBe(0);
    expect(await exists(LOCAL_PATH)).toBe(false);
    expect(await exists(STATE_PATH)).toBe(false);
  });
});

describe('status line bridge flag without Claude Code (DEC-08, TC-15, codereview_01/CR-06)', () => {
  it('fails with an argument error and writes nothing when claude-code is not detected', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'cb-statusline-no-claude-'));
    try {
      for (const argv of [INSTALL, [...INSTALL, '--dry-run']]) {
        const report = await runJson({ root: empty, home: world.home }, argv) as unknown as { exitCode: number; error: { code: string } };
        expect(report).toMatchObject({ exitCode: INVALID_ARGUMENTS_EXIT_CODE, error: { code: 'INVALID_ARGUMENTS' } });
      }
      expect(await readdir(empty)).toEqual([]);
    } finally {
      await rm(empty, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
