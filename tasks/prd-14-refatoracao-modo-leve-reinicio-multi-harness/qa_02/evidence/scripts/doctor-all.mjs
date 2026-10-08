// qa_01/BUG-01 doctor half, re-run for qa_02: NO_COLOR doctor text on an all-harness fixture after init --auto-restart.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, cli, EVIDENCE, makeRepo, note, results, FIXTURE_FILES } from './lib.mjs';
const ev = 'doctor-all-text.txt';
await writeFile(join(EVIDENCE, ev), '# qa_01/BUG-01 re-run (doctor half): doctor text on a fixture with all eight harnesses after init --yes --auto-restart\n');
const repo = await makeRepo('doctor-all', Object.keys(FIXTURE_FILES));
const init = await cli(repo, ['init', '--yes', '--auto-restart'], ev);
check('doctor-all', 'init exit 0', init.code === 0, init.stderr);
const r = await cli(repo, ['doctor'], ev);
const lines = (r.stdout + r.stderr).split('\n').filter((l) => /AUTO_RESTART_READY/.test(l));
await note(ev, `AUTO_RESTART_READY lines:\n${lines.join('\n')}`);
const named = lines.map((l) => / on ([a-z-]+)\.\s*$/.exec(l.trim())?.[1] ?? null);
check('doctor-all', 'three semi-automatic READY lines (codex-cli, cursor, github-copilot-cli), each naming a distinct harness id', named.length === 3 && named.every((h) => h !== null) && new Set(named).size === 3 && ['codex-cli', 'cursor', 'github-copilot-cli'].every((h) => named.includes(h)), lines.join(' | '));
await writeFile(join(EVIDENCE, 'doctor-all-results.json'), JSON.stringify(results, null, 1));
console.log(`TOTAL ${results.length}, failed ${results.filter((x) => !x.ok).length}`);
