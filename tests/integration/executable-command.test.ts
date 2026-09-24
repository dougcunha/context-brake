import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveSpawnCommand, ShimArgumentError } from '../../src/infrastructure/process/executable-command.js';
import { runPassthrough, WrappedCommandStartError } from '../../src/infrastructure/runner/passthrough-process.js';

let binDirectory: string;
function windows(extra: NodeJS.ProcessEnv = {}) {
  return { platform: 'win32' as const, environment: { Path: binDirectory, PATHEXT: '.EXE;.CMD', ComSpec: 'C:\\Windows\\system32\\cmd.exe', ...extra } };
}

beforeEach(async () => {
  binDirectory = await mkdtemp(join(tmpdir(), 'cb-t06-bin-'));
  await writeFile(join(binDirectory, 'tool.cmd'), '@echo off\r\necho shim:%~1\r\nexit /b 5\r\n', 'utf8');
  await writeFile(join(binDirectory, 'native.exe'), '', 'utf8');
});
afterEach(async () => { await rm(binDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Windows shim rule (DEC-04, DEC-19)', () => {
  it('spawns other platforms directly by name', async () => {
    expect(await resolveSpawnCommand(['tool', 'a|b'], { platform: 'linux', environment: {} })).toEqual({ executable: 'tool', args: ['a|b'], verbatim: false });
  });

  it('runs a .cmd shim through cmd.exe with each argument quoted', async () => {
    const command = await resolveSpawnCommand(['tool', 'one two', ''], windows());
    expect(command).toEqual({ executable: 'C:\\Windows\\system32\\cmd.exe', args: ['/d', '/s', '/c', `""${join(binDirectory, 'tool.cmd')}" "one two" """`], verbatim: true });
  });

  it('spawns a resolved executable directly', async () => {
    expect(await resolveSpawnCommand(['native', 'a|b'], windows())).toEqual({ executable: join(binDirectory, 'native.exe'), args: ['a|b'], verbatim: false });
  });

  it.each(['50%', 'a^b', 'a&b', 'a|b', '<in', '>out', 'say "hi"', 'line\nbreak'])('rejects %j for a shim with INVALID_ARGUMENTS', async (argument) => {
    await expect(resolveSpawnCommand(['tool', argument], windows())).rejects.toMatchObject({ name: 'ShimArgumentError', code: 'INVALID_ARGUMENTS' });
  });

  it('leaves an unknown command to the spawn error', async () => {
    expect(await resolveSpawnCommand(['missing-tool'], windows({ ComSpec: undefined }))).toEqual({ executable: 'missing-tool', args: [], verbatim: false });
    expect(ShimArgumentError.name).toBe('ShimArgumentError');
  });
});

describe('passthrough process (TC-16, DEC-19)', () => {
  it('runs a real .cmd shim on Windows and keeps its exit code', async (ctx) => {
    if (process.platform !== 'win32') ctx.skip('Windows command shims exist only on win32.');
    const stdout = new PassThrough();
    const chunks: Buffer[] = [];
    stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    const result = await runPassthrough({ argv: ['tool', 'hello world'], cwd: binDirectory, streams: { stdout, stderr: new PassThrough() }, host: windows({ ...process.env, Path: binDirectory }) });
    expect(result.exitCode).toBe(5);
    expect(Buffer.concat(chunks).toString()).toContain('shim:hello world');
    expect(result.characters).toBe(Buffer.concat(chunks).toString().length);
  });

  it('fails with a clear error when the command cannot start', async () => {
    const streams = { stdout: new PassThrough(), stderr: new PassThrough() };
    await expect(runPassthrough({ argv: ['context-brake-missing-command'], cwd: binDirectory, streams })).rejects.toBeInstanceOf(WrappedCommandStartError);
  });
});
