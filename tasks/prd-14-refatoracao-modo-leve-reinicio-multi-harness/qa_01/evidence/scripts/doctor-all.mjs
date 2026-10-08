import { cli, makeRepo, note, FIXTURE_FILES } from './lib.mjs';
const ev = 'init-auto-restart-all.txt';
await note(ev, 'BUG-01 doctor half: NO_COLOR doctor text on a fresh all-harness fixture after init --yes --auto-restart');
const repo = await makeRepo('doctor-all', Object.keys(FIXTURE_FILES));
await cli(repo, ['init', '--yes', '--auto-restart'], ev);
const r = await cli(repo, ['doctor'], ev);
const lines = (r.stdout + r.stderr).split('\n').filter((l) => /AUTO_RESTART_(READY|NOT_LOADED)/.test(l));
console.log(r.code, lines.join('\n'));
