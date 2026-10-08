// NFR-02: built CLI under PowerShell 7, Windows PowerShell 5.1, and Git Bash on Windows.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, CLI, EVIDENCE, makeRepo, results, run, exists } from './lib.mjs';
const ev = 'shells.txt';
await writeFile(join(EVIDENCE, ev), '# Built CLI under PowerShell 7, Windows PowerShell 5.1, and Git Bash on Windows (NFR-02)\n');
const NODE = process.execPath;
const ps = (a) => ['-NoProfile', '-NonInteractive', '-Command', `& '${NODE}' '${CLI}' ${a}; exit $LASTEXITCODE`];
const shells = {
  pwsh: ['C:/Program Files/WindowsApps/Microsoft.PowerShell_7.6.6.0_x64__8wekyb3d8bbwe/pwsh.exe', ps],
  'powershell-5.1': [`${process.env.SystemRoot}/System32/WindowsPowerShell/v1.0/powershell.exe`, ps],
  'git-bash': ['C:/Users/Admin/scoop/apps/git/current/bin/bash.exe', (a) => ['-c', `"${NODE.split(String.fromCharCode(92)).join('/')}" "${CLI}" ${a}`]],
};
const passthrough = Object.fromEntries(['LOCALAPPDATA', 'APPDATA', 'ProgramFiles', 'ProgramData', 'SystemDrive', 'windir', 'PSModulePath', 'COMSPEC', 'USERNAME'].filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
const extraEnv = { ...passthrough, PATH: `${process.env.SystemRoot}/System32/WindowsPowerShell/v1.0;${process.env.SystemRoot}/System32;C:/Program Files/nodejs;C:/Users/Admin/scoop/apps/git/2.56.0.2/ucrt64/bin` };
for (const [name, [cmd, argv]] of Object.entries(shells)) {
  const repo = await makeRepo(`shell-${name}`, ['pi', 'codex-cli']);
  const init = await run(repo, cmd, argv('init --yes --auto-restart'), { evidence: ev, extraEnv });
  check(`shell-${name}`, 'init --auto-restart exit 0, restart file installed, text names pi', init.code === 0 && await exists(join(repo.root, '.pi/extensions/context-brake-restart.js')) && init.stdout.includes('Restart is automatic on pi.'), `exit=${init.code} ${init.stdout.slice(0, 200)} ${init.stderr}`);
  const rem = await run(repo, cmd, argv('remove --yes'), { evidence: ev, extraEnv });
  check(`shell-${name}`, 'remove exit 0 and restart file gone', rem.code === 0 && !(await exists(join(repo.root, '.pi/extensions/context-brake-restart.js'))), `exit=${rem.code} ${rem.stderr}`);
}
await writeFile(join(EVIDENCE, 'shells-results.json'), JSON.stringify(results, null, 1));
console.log(`TOTAL ${results.length}, failed ${results.filter((r) => !r.ok).length}`);
