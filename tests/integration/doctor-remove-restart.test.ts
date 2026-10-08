import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema, installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

let base = '';
let root = '';
let env: Record<string, string> = {};

type Finding = { readonly code: string; readonly harness: string | null; readonly message: string; readonly impact: string | null };

async function doctorFindings(): Promise<Finding[]> {
  const result = await runInProcessCli(['doctor', '--json'], root, env);
  return doctorReportSchema.parse(JSON.parse(result.stdout)).findings;
}

async function writeHandoffs(): Promise<void> {
  await mkdir(join(root, '.context-brake', 'handoffs'), { recursive: true });
  await writeFile(join(root, '.context-brake', 'handoff.md'), '# Goal\n', 'utf8');
  await writeFile(join(root, '.context-brake', 'handoffs', '20261001T000000.000Z.md'), '# Old\n', 'utf8');
}

beforeEach(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), 'cb-doctor-restart-')));
  root = join(base, 'repo');
  const home = join(base, 'home');
  await mkdir(join(root, '.pi'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await mkdir(home, { recursive: true });
  await writeFile(join(root, '.pi', 'settings.json'), '{}\n', 'utf8');
  await writeFile(join(root, '.codex', 'hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  env = { HOME: home, USERPROFILE: home, PATH: '' };
  await runInProcessCli(['init', '--yes', '--json', '--auto-restart'], root, env);
});
afterEach(async () => { await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('doctor reports restart per harness (prd-14 FR-10, FR-11, DEC-13, TC-12)', () => {
  it('reports the automatic harness as not loaded, the semi-automatic one as ready, and a pending handoff', async () => {
    await writeHandoffs();
    const findings = await doctorFindings();
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'AUTO_RESTART_NOT_LOADED', harness: 'pi' }),
      expect.objectContaining({ code: 'AUTO_RESTART_READY', harness: 'codex-cli', message: 'Semi-automatic restart is ready on codex-cli.' }),
      expect.objectContaining({ code: 'AUTO_RESTART_HANDOFF', message: expect.stringContaining('A handoff is pending') }),
    ]));
  });
  it('reports ready and the last skip reason from the Pi restart log', async () => {
    await mkdir(join(root, '.context-brake/runtime/restart/pi'), { recursive: true });
    const log = { v: 2, harness: 'pi', componentVersion: '1.0.0', harnessVersion: 'unknown', records: [{ at: '2026-10-07T12:00:00.000Z', code: 'SKIP_HANDOFF_MISSING' }] };
    await writeFile(join(root, '.context-brake/runtime/restart/pi/s1.json'), JSON.stringify(log), 'utf8');
    const pi = (await doctorFindings()).filter((finding) => finding.harness === 'pi' && finding.code.startsWith('AUTO_RESTART'));
    expect(pi.map((finding) => finding.code).sort()).toEqual(['AUTO_RESTART_LAST_SKIP', 'AUTO_RESTART_READY']);
    expect(pi.find((finding) => finding.code === 'AUTO_RESTART_LAST_SKIP')?.message).toContain('SKIP_HANDOFF_MISSING');
    expect(pi.find((finding) => finding.code === 'AUTO_RESTART_READY')?.impact).toBe('Automatic restart: a valid reset signal opens a new session by itself.');
  });
});

describe('doctor reports outdated and adapter-owned restart findings (prd-14 FR-11, TC-12)', () => {
  it('reports an outdated running restart module when the Pi log names another component version (TC-12)', async () => {
    await mkdir(join(root, '.context-brake/runtime/restart/pi'), { recursive: true });
    const log = { v: 2, harness: 'pi', componentVersion: '0.9.0', harnessVersion: 'unknown', records: [] };
    await writeFile(join(root, '.context-brake/runtime/restart/pi/s1.json'), JSON.stringify(log), 'utf8');
    const pi = (await doctorFindings()).filter((finding) => finding.harness === 'pi' && finding.code.startsWith('AUTO_RESTART'));
    expect(pi.map((finding) => finding.code)).toEqual(['AUTO_RESTART_OUTDATED_MOD']);
  });
  it('reports only the adapter finding for Oh-My-Pi, without a semi-automatic ready finding', async () => {
    await mkdir(join(root, '.omp'), { recursive: true });
    await writeFile(join(root, '.omp', 'config.yml'), 'theme: dark\n', 'utf8');
    await runInProcessCli(['init', '--yes', '--json', '--auto-restart'], root, env);
    const omp = (await doctorFindings()).filter((finding) => finding.harness === 'oh-my-pi' && finding.code.startsWith('AUTO_RESTART'));
    expect(omp.map((finding) => finding.code)).toEqual(['AUTO_RESTART_NOT_LOADED']);
  });
});

describe('remove keeps the handoffs (prd-14 FR-13, DEC-14, TC-14)', () => {
  it('deletes every restart artifact, keeps the handoffs, and names them', async () => {
    await writeHandoffs();
    const result = await runInProcessCli(['remove', '--yes', '--json'], root, env);
    const report = installReportSchema.parse(JSON.parse(result.stdout));
    expect(report.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'AUTO_RESTART_HANDOFF_KEPT', message: 'Session handoffs were kept: .context-brake/handoff.md, .context-brake/handoffs/.' })]));
    await expect(readdir(join(root, '.pi', 'extensions'))).resolves.not.toContain('context-brake-restart.js');
    expect(await readdir(join(root, '.context-brake'))).toEqual(expect.arrayContaining(['handoff.md', 'handoffs']));
    expect(await readdir(join(root, '.context-brake'))).not.toContain('.gitignore');
    expect(JSON.parse(await readFile(join(root, '.codex', 'hooks.json'), 'utf8'))).toEqual({ hooks: {} });
  });
});
