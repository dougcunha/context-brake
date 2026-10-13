import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, cp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [, , root, mode, evidenceFile] = process.argv;
const REPO = 'D:/MyProjects/ContextBrake';
const proj = await mkdtemp(join(root, 'pty-'));
await mkdir(join(proj, '.claude'), { recursive: true });
await writeFile(join(proj, '.claude/settings.json'), '{\n  "hooks": {}\n}\n');
if (process.env.PTY_PROJECT !== 'none') await cp(join(REPO, '.agents/skills'), join(proj, '.claude/skills'), { recursive: true });
import { spawnSync } from 'node:child_process';
if (process.env.PTY_EXTRA === '1') {
  await mkdir(join(proj, '.agents/skills/codex-handoff'), { recursive: true });
  await writeFile(join(proj, '.agents/skills/codex-handoff/SKILL.md'), ['---', 'name: codex-handoff', 'description: handoff notes', '---', ''].join('\n'));
  await cp(join(proj, '.claude/skills/sdd-snapshot'), join(proj, '.agents/skills/sdd-snapshot'), { recursive: true });
}
const denied = join(proj, '.claude/skills');
if (process.env.PTY_DENY === '1') spawnSync('icacls', [denied, '/deny', 'Admin:(RD)']);
const env = { ...process.env, TERM: 'xterm' };
if (mode === 'plain') env.CONTEXT_BRAKE_PLAIN_PROMPTS = '1';
const args = ['-Xallow-non-tty', '-Xplain', process.execPath, join(REPO, 'dist/src/cli/main.js'), 'init', '--interactive', ...(process.env.PTY_APPLY === '1' ? [] : ['--dry-run'])];
const child = spawn('winpty', args, { cwd: proj, env, stdio: ['pipe', 'pipe', 'pipe'] });
let out = '';
const strip = (s) => s.replaceAll(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
child.stdout.on('data', (d) => { out += d.toString(); });
child.stderr.on('data', (d) => { out += '[stderr]' + d.toString(); });
const answers = (process.argv[5] ?? '').split('|');
let sent = 0;
let lastLen = -1;
const timer = setInterval(() => {
  if (out.length === lastLen && sent < answers.length) {
    child.stdin.write(answers[sent] === 'ENTER' ? '\r' : answers[sent] === 'DOWN' ? '\x1b[B' : answers[sent] + '\r');
    sent++;
  }
  lastLen = out.length;
}, 1500);
const done = new Promise((res) => { child.on('close', (code) => res(code)); child.on('error', (e) => { out += 'SPAWN ERROR ' + e.message; res(-1); }); });
const code = await Promise.race([done, new Promise((r) => setTimeout(() => r('TIMEOUT'), 60000))]);
clearInterval(timer);
child.kill();
if (process.env.PTY_DENY === '1') spawnSync('icacls', [denied, '/remove:d', 'Admin']);
let cfg = '';
try { cfg = await (await import('node:fs/promises')).readFile(join(proj, 'context-brake.config.json'), 'utf8'); } catch { cfg = '(no context-brake.config.json written)'; }
await writeFile(evidenceFile, `mode=${mode} exit=${code} answersSent=${sent}\n----\n${strip(out)}\n----\ncontext-brake.config.json:\n${cfg}\n`);
console.log('exit', code, 'sent', sent, 'bytes', out.length);
