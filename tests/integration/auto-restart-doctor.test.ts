import { rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import { MOD_MODULE_FILE } from '../../src/infrastructure/harnesses/claude-code/auto-restart-files.js';
import { MOD_LOG_DIR, MOD_VERSION } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';
import { autoRestartFindings, modLog, writeModLog } from '../helpers/auto-restart-doctor-world.js';
import { createStatuslineWorld, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

const INIT = ['init', '--yes', '--json'];
let world: StatuslineWorld;

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

function codes(findings: readonly DiagnosticFinding[]): string[] {
  return findings.map((finding) => `${finding.code}:${finding.severity}`);
}

describe('doctor automatic-restart findings (FR-08, DEC-10, TC-22)', () => {
  it('reports off without a warning when the config has no autoRestart block', async () => {
    await runJson(world, INIT);
    expect(codes(await autoRestartFindings(world.root, false))).toEqual(['AUTO_RESTART_OFF:ok']);
  });

  it('reports the mod as not loaded, listing the causes that switch mods off', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    await writeModLog(world.root, 'broken', '{ not json');
    await writeModLog(world.root, 'old-format', { v: 0, records: [] });
    const [finding] = await autoRestartFindings(world.root, true);
    expect(`${finding?.code}:${finding?.severity}`).toBe('AUTO_RESTART_NOT_LOADED:warning');
    expect(finding?.remediation).toContain('disableAllHooks');
  });
});

describe('doctor automatic-restart problems (FR-08, TC-22)', () => {
  it('reports drift when the last session loaded another mod version', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    await writeModLog(world.root, 'older', modLog([], MOD_VERSION));
    await writeModLog(world.root, 'newer', modLog([], '0.9.0'));
    await utimes(join(world.root, MOD_LOG_DIR, 'older.json'), new Date('2026-01-01'), new Date('2026-01-01'));
    const [finding] = await autoRestartFindings(world.root, true);
    expect(finding?.code).toBe('AUTO_RESTART_OUTDATED_MOD');
    expect(finding?.message).toContain('0.9.0');
    expect(finding?.remediation).toContain('context-brake init --auto-restart');
  });

  it('reports drift when a mod file is missing', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    await rm(join(world.root, MOD_MODULE_FILE));
    expect(codes(await autoRestartFindings(world.root, true))).toEqual(['AUTO_RESTART_OUTDATED_MOD:warning']);
  });

  it('reports a Claude Code older than the mods minimum version', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    const [finding] = await autoRestartFindings(world.root, true, '2.1.200');
    expect(finding?.code).toBe('AUTO_RESTART_CLAUDE_TOO_OLD');
    expect(finding?.remediation).toContain('2.1.287');
  });
});

describe('doctor ready state and last automatic-restart skip (FR-08, DEC-10, TC-22)', () => {
  it('reports ready alone after a restart, adds the last skip code next to it, as a warning only for errors', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    await writeModLog(world.root, 'skip', modLog([{ at: '2026-10-05T10:00:00.000Z', code: 'RESTARTED' }]));
    expect(codes(await autoRestartFindings(world.root, true))).toEqual(['AUTO_RESTART_READY:ok']);
    await writeModLog(world.root, 'skip', modLog([{ at: '2026-10-05T10:00:00.000Z', code: 'RESTARTED' }, { at: '2026-10-05T11:00:00.000Z', code: 'SKIP_NO_PROGRESS' }]));
    expect(codes(await autoRestartFindings(world.root, true))).toEqual(['AUTO_RESTART_READY:ok', 'AUTO_RESTART_LAST_SKIP:ok']);
    await writeModLog(world.root, 'skip', modLog([{ at: '2026-10-05T12:00:00.000Z', code: 'ERROR_RESTART_REJECTED' }]));
    const last = (await autoRestartFindings(world.root, true)).at(-1);
    expect(last?.severity).toBe('warning');
    expect(last?.message).toContain('ERROR_RESTART_REJECTED');
  });
});
