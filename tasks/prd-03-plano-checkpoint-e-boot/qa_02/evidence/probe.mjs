import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const [cwd, payloadPath, clearPath, script, ...scriptArgs] = process.argv.slice(2);
const env = { ...process.env };
if (clearPath === 'clear-path') env.PATH = '';
const input = payloadPath === 'none' ? '' : readFileSync(payloadPath, 'utf8');
const child = spawn(process.execPath, [script, ...scriptArgs], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
child.stdout.on('data', (data) => { stdout += data.toString(); });
child.stderr.on('data', (data) => { stderr += data.toString(); });
child.stdin.end(input);
child.on('close', (code) => { process.stdout.write(JSON.stringify({ code, stdout, stderr })); });
