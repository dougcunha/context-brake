// QA scenarios A: OBJ-01, FR-01, FR-02, FR-03 (harness files), FR-04 dry-run/json/text, NFR-01 idempotency.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { blockLines, cb, check, git, log, newRepo, outsideBlock, read, scenario, summary } from './lib.mjs';

const HARNESS_EDITED = new Set(['.claude/settings.json', '.claude/settings.local.json', '.codex/hooks.json', '.codex/config.toml']);
function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, root, out); else out.push(relative(root, p).replaceAll('\\', '/'));
  }
  return out;
}
function untracked(dir) { return git(dir, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean); }
function expectedLines(dir) {
  const m = JSON.parse(read(dir, '.context-brake/manifest.json'));
  const runtime = walk(join(dir, '.context-brake/runtime'), dir).map((p) => p);
  return [...new Set(['context-brake.config.json', '.context-brake/manifest.json', ...m.assets.map((a) => a.path), ...runtime])].sort().map((p) => `/${p}`);
}

// S01: every optional feature on, two harnesses, existing user .gitignore
scenario('S01-every-feature-on');
const r1 = newRepo('s01', { gitignore: 'node_modules/\n', codex: true });
const before = new Set(walk(r1));
const a = cb(r1, ['init', '--yes', '--auto-restart', '--statusline-bridge', '--debug', '--snapshot-command', '/qa-snap', '--harness', 'claude-code', '--harness', 'codex-cli']);
check('S01 exit 0', a.code === 0, `exit=${a.code}`);
const created = walk(r1).filter((p) => !before.has(p));
log(`created files: ${JSON.stringify(created, null, 1)}`);
log(`.gitignore:\n${read(r1, '.gitignore')}`);
log(`manifest:\n${read(r1, '.context-brake/manifest.json')}`);
const st = untracked(r1);
log(`git status --porcelain -uall:\n${st.join('\n')}`);
const ownedVisible = st.map((l) => l.slice(3)).filter((p) => !HARNESS_EDITED.has(p) && p !== '.gitignore');
check('S01 OBJ-01 no ContextBrake-owned file untracked', ownedVisible.length === 0, JSON.stringify(ownedVisible));
const createdVisible = created.filter((p) => st.some((l) => l.slice(3) === p) && !HARNESS_EDITED.has(p) && p !== '.gitignore');
check('S01 OBJ-01 every created file except harness configs is ignored', createdVisible.length === 0, JSON.stringify(createdVisible));
const lines = blockLines(read(r1, '.gitignore'));
check('S01 FR-01 block equals config+manifest+assets+runtime state', JSON.stringify(lines) === JSON.stringify(expectedLines(r1)), `block=${JSON.stringify(lines)} expected=${JSON.stringify(expectedLines(r1))}`);
check('S01 FR-01 anchored lines', lines !== null && lines.every((l) => l.startsWith('/')));
check('S01 FR-01 mod files listed', lines !== null && lines.some((l) => l.startsWith('/.context-brake/claude-mod/')) && lines.includes('/.context-brake/.gitignore'));
check('S01 FR-01 both harness scripts listed', lines !== null && lines.includes('/.claude/hooks/context-brake.mjs') && lines.includes('/.codex/hooks/context-brake.mjs'));
check('S01 FR-03 harness config files not listed', lines !== null && !lines.some((l) => HARNESS_EDITED.has(l.slice(1))));
const outA = outsideBlock(read(r1, '.gitignore'));
check('S01 FR-04 user content kept before block', outA.before === 'node_modules/\n\n' && outA.after === '\n', JSON.stringify(outA));
check('S01 FR-04 text plan names .gitignore with summary', /\.gitignore/.test(a.stdout) && a.stdout.includes("Keep ContextBrake's files out of Git"));

// S02: second run plans nothing, applies nothing (FR-02, NFR-01)
scenario('S02-second-run-idempotent');
const ign1 = read(r1, '.gitignore');
const dj = cb(r1, ['init', '--dry-run', '--json', '--auto-restart', '--statusline-bridge', '--debug', '--snapshot-command', '/qa-snap', '--harness', 'claude-code', '--harness', 'codex-cli']);
const giChanges = (dj.json?.plan?.changes ?? []).filter((c) => c.owner === 'gitignore');
check('S02 dry-run plans no .gitignore change', dj.json !== null && giChanges.length === 0, JSON.stringify(giChanges));
check('S02 dry-run plans no change at all', dj.json !== null && (dj.json.plan.changes ?? []).length === 0, JSON.stringify((dj.json?.plan?.changes ?? []).map((c) => c.path)));
const b = cb(r1, ['init', '--yes', '--auto-restart', '--statusline-bridge', '--debug', '--snapshot-command', '/qa-snap', '--harness', 'claude-code', '--harness', 'codex-cli']);
check('S02 exit 0', b.code === 0);
check('S02 .gitignore byte-identical after second run', read(r1, '.gitignore') === ign1);

// S03: options change, list follows (FR-02, OBJ-02)
scenario('S03-options-change');
const c = cb(r1, ['init', '--yes', '--no-auto-restart']);
check('S03 exit 0 (--no-auto-restart)', c.code === 0);
let l3 = blockLines(read(r1, '.gitignore'));
log(`.gitignore after --no-auto-restart:\n${read(r1, '.gitignore')}`);
check('S03 mod lines removed', l3 !== null && !l3.some((l) => l.startsWith('/.context-brake/claude-mod/')));
check('S03 block equals manifest list', JSON.stringify(l3) === JSON.stringify(expectedLines(r1)), `block=${JSON.stringify(l3)} expected=${JSON.stringify(expectedLines(r1))}`);
const d = cb(r1, ['init', '--yes', '--exclude-harness', 'codex-cli']);
check('S03 exit 0 (--exclude-harness codex-cli)', d.code === 0);
l3 = blockLines(read(r1, '.gitignore'));
log(`.gitignore after excluding codex:\n${read(r1, '.gitignore')}`);
check('S03 codex script line removed', l3 !== null && !l3.includes('/.codex/hooks/context-brake.mjs'));
check('S03 block equals manifest list after harness off', JSON.stringify(l3) === JSON.stringify(expectedLines(r1)), `block=${JSON.stringify(l3)} expected=${JSON.stringify(expectedLines(r1))}`);
const e = cb(r1, ['init', '--yes', '--auto-restart']);
l3 = blockLines(read(r1, '.gitignore'));
check('S03 mod lines return with --auto-restart', e.code === 0 && l3 !== null && l3.some((l) => l.startsWith('/.context-brake/claude-mod/')));
const st3 = untracked(r1).map((x) => x.slice(3)).filter((p) => !HARNESS_EDITED.has(p) && p !== '.gitignore');
check('S03 no owned file untracked after changes', st3.length === 0, JSON.stringify(st3));

// S04: dry-run and json on a fresh repo (FR-04, NFR-02)
scenario('S04-dry-run-json-text');
const r4 = newRepo('s04', { gitignore: 'dist/\n' });
const dr = cb(r4, ['init', '--dry-run', '--json']);
const ch = (dr.json?.plan?.changes ?? []).filter((x) => x.path === '.gitignore');
check('S04 json plan has .gitignore change owner gitignore', ch.length === 1 && ch[0].owner === 'gitignore' && ch[0].kind === 'update', JSON.stringify(ch));
check('S04 dry-run wrote nothing', read(r4, '.gitignore') === 'dist/\n' && read(r4, 'context-brake.config.json') === null);
const dt = cb(r4, ['init', '--dry-run']);
check('S04 NO_COLOR text shows [update] .gitignore (gitignore)', dt.stdout.includes('[update] .gitignore (gitignore)'), '');
check('S04 text summary line', dt.stdout.includes("Keep ContextBrake's files out of Git"));
check('S04 no ANSI escapes with NO_COLOR', !/\x1b\[/.test(dt.stdout));
const r4b = newRepo('s04b', {});
const dc = cb(r4b, ['init', '--dry-run', '--json']);
const chc = (dc.json?.plan?.changes ?? []).filter((x) => x.path === '.gitignore');
check('S04 missing .gitignore planned as create', chc.length === 1 && chc[0].kind === 'create', JSON.stringify(chc));
const dct = cb(r4b, ['init', '--dry-run']);
check('S04 text shows [create] .gitignore (gitignore)', dct.stdout.includes('[create] .gitignore (gitignore)'));
process.exitCode = summary();
