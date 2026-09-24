import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export type CliRunResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

export function runBuiltCli(args: readonly string[], cwd: string, env?: Readonly<Record<string, string>>): Promise<CliRunResult> {
  return new Promise((res) => {
    const cliPath = resolve('dist/src/cli/main.js');
    const childEnv = env === undefined ? undefined : { ...process.env, ...env };
    const child = spawn(process.execPath, [cliPath, ...args], { cwd, env: childEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => { res({ code, stdout, stderr }); });
  });
}
