import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, CLI, EVIDENCE, makeRepo, results, run, exists } from './lib.mjs';
const ev = 'shells.txt';
await writeFile(join(EVIDENCE, ev), '# Built CLI under PowerShell and Git Bash on Windows (NFR-02)\n');
const shells = { powershell: ['powershell.exe', (a) => ['-NoProfile', '-NonInteractive', '-Command', `& '${process.execPath}' '${CLI}' ${a}`]], bash: ['C:/Users/Admin/scoop/apps/git/current/bin/bash.exe', (a) => ['-c', `"${process.execPath.split(String.fromCharCode(92)).join('/')}" "${CLI}" ${a}`]] };
for (const [name, [cmd, argv]] of Object.entries(shells)) {
  const repo = await makeRepo(`shell-${name}`, ['pi', 'codex-cli']);
  const init = await run(repo, cmd, argv('init --yes --auto-restart'), { evidence: ev, extraEnv: { PATH: `${process.env.SystemRoot}/System32/WindowsPowerShell/v1.0;${process.env.SystemRoot}/System32;C:/Program Files/nodejs;C:/Users/Admin/scoop/apps/git/2.56.0.2/ucrt64/bin` } });
  check(`shell-${name}`, 'init --auto-restart exit 0 and restart file installed', init.code === 0 && await exists(join(repo.root, '.pi/extensions/context-brake-restart.js')), init.stderr);
  const rem = await run(repo, cmd, argv('remove --yes'), { evidence: ev, extraEnv: { PATH: `${process.env.SystemRoot}/System32/WindowsPowerShell/v1.0;${process.env.SystemRoot}/System32;C:/Program Files/nodejs;C:/Users/Admin/scoop/apps/git/2.56.0.2/ucrt64/bin` } });
  check(`shell-${name}`, 'remove exit 0 and restart file gone', rem.code === 0 && !(await exists(join(repo.root, '.pi/extensions/context-brake-restart.js'))), rem.stderr);
}
console.log(`TOTAL ${results.length}, failed ${results.filter(r => !r.ok).length}`);
