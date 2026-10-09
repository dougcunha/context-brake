// QA scenarios B: OBJ-03/FR-04 bytes, malformed markers, FR-05, FR-06/OBJ-05, FR-07, FR-08, FR-03 symlink, exit 64.
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { END, START, blockLines, cb, check, git, log, newRepo, read, readBytes, scenario, summary } from './lib.mjs';

const jsonDocs = [];
function cbj(dir, args) { const r = cb(dir, args); if (r.json) jsonDocs.push({ args: args.join(' '), doc: r.json }); return r; }

// S05: OBJ-03 mixed endings, comments, blank lines, no final newline; second run; remove
scenario('S05-bytes-outside-block');
const original5 = '# user comment\r\nnode_modules/\n\r\n\n# another\r\n*.log\r\ndist';
const r5 = newRepo('s05', { gitignore: original5 });
const a5 = cbj(r5, ['init', '--yes', '--json']);
check('S05 exit 0', a5.code === 0, `exit=${a5.code}`);
const t5 = read(r5, '.gitignore');
log(`after init (JSON.stringify): ${JSON.stringify(t5)}`);
const s = t5.indexOf(START);
check('S05 bytes before block = original + one inserted break + blank line (CRLF file)', t5.slice(0, s) === `${original5}\r\n\r\n`, JSON.stringify(t5.slice(0, s)));
check('S05 block written with CRLF', t5.slice(s).split('\r\n').length > 3 && t5.endsWith(`${END}\r\n`));
cbj(r5, ['init', '--yes']);
check('S05 second run byte-identical', read(r5, '.gitignore') === t5);
const rm5 = cbj(r5, ['remove', '--yes', '--json']);
check('S05 remove exit 0', rm5.code === 0, `exit=${rm5.code}`);
log(`after remove (JSON.stringify): ${JSON.stringify(read(r5, '.gitignore'))}`);
check('S05 remove leaves original + inserted break only (HIL 2 OI-01)', read(r5, '.gitignore') === `${original5}\r\n`, JSON.stringify(read(r5, '.gitignore')));
// LF file with final newline: exact round trip
const original5b = '# keep\nnode_modules/\n\n  # indented comment\n*.tmp\n';
const r5b = newRepo('s05b', { gitignore: original5b });
cbj(r5b, ['init', '--yes']);
const t5b = read(r5b, '.gitignore');
check('S05b LF: before block = original + blank line', t5b.slice(0, t5b.indexOf(START)) === `${original5b}\n` && !t5b.includes('\r'));
cbj(r5b, ['init', '--yes']);
check('S05b second run identical', read(r5b, '.gitignore') === t5b);
cbj(r5b, ['remove', '--yes']);
check('S05b OBJ-05 remove restores original byte for byte', Buffer.compare(readBytes(r5b, '.gitignore'), Buffer.from(original5b)) === 0);
// CRLF with final newline: exact round trip
const original5c = 'node_modules/\r\n# c\r\n';
const r5c = newRepo('s05c', { gitignore: original5c });
cbj(r5c, ['init', '--yes']);
cbj(r5c, ['remove', '--yes']);
check('S05c OBJ-05 CRLF round trip byte for byte', read(r5c, '.gitignore') === original5c, JSON.stringify(read(r5c, '.gitignore')));

// S06: malformed markers
scenario('S06-malformed-markers');
for (const [name, content] of [['start-only', `x/\n${START}\n/foo\n`], ['end-only', `x/\n${END}\n`], ['two-pairs', `${START}\n/a\n${END}\n${START}\n/b\n${END}\n`]]) {
  const r6 = newRepo(`s06-${name}`, { gitignore: content });
  const a6 = cbj(r6, ['init', '--yes', '--json']);
  const conflicts = JSON.stringify(a6.json);
  check(`S06 ${name}: conflict GITIGNORE_MARKERS_MALFORMED naming .gitignore`, conflicts.includes('GITIGNORE_MARKERS_MALFORMED') && conflicts.includes('.gitignore'));
  check(`S06 ${name}: .gitignore untouched`, read(r6, '.gitignore') === content);
  check(`S06 ${name}: rest of init applied (config and hook written)`, read(r6, 'context-brake.config.json') !== null && read(r6, '.claude/hooks/context-brake.mjs') !== null);
  log(`exit code with malformed markers: ${a6.code}; status=${a6.json?.status}`);
}

// S07: missing .gitignore created with only block; remove deletes it
scenario('S07-missing-gitignore');
const r7 = newRepo('s07', {});
cbj(r7, ['init', '--yes']);
const t7 = read(r7, '.gitignore');
log(`created .gitignore:\n${t7}`);
check('S07 created with only the block', t7 !== null && t7.startsWith(START) && t7.trimEnd().endsWith(END));
cbj(r7, ['remove', '--yes']);
check('S07 remove deletes the block-only .gitignore', read(r7, '.gitignore') === null);

// S08: FR-05 opt-out, persistence, opt-in, both flags
scenario('S08-opt-out-opt-in');
const r8 = newRepo('s08', { gitignore: 'node_modules/\n' });
cbj(r8, ['init', '--yes']);
check('S08 block present after first init', blockLines(read(r8, '.gitignore')) !== null);
check('S08 config has no gitIgnore key by default', !('gitIgnore' in JSON.parse(read(r8, 'context-brake.config.json'))));
const n8 = cbj(r8, ['init', '--yes', '--no-gitignore']);
check('S08 --no-gitignore exit 0', n8.code === 0);
check('S08 --no-gitignore removes block, user content back', read(r8, '.gitignore') === 'node_modules/\n', JSON.stringify(read(r8, '.gitignore')));
check('S08 config stores gitIgnore:false', JSON.parse(read(r8, 'context-brake.config.json')).gitIgnore === false);
cbj(r8, ['init', '--yes']);
check('S08 plain init keeps the opt-out', read(r8, '.gitignore') === 'node_modules/\n');
const g8 = cbj(r8, ['init', '--yes', '--gitignore']);
check('S08 --gitignore returns the block', g8.code === 0 && blockLines(read(r8, '.gitignore')) !== null);
check('S08 --gitignore drops the key', !('gitIgnore' in JSON.parse(read(r8, 'context-brake.config.json'))));
const both = cb(r8, ['init', '--yes', '--gitignore', '--no-gitignore']);
check('S08 both flags -> exit 64 with message', both.code === 64 && /--gitignore cannot be combined with --no-gitignore/.test(both.stdout + both.stderr), `exit=${both.code}`);
const r8b = newRepo('s08b', {});
cbj(r8b, ['init', '--yes', '--no-gitignore']);
check('S08b --no-gitignore on fresh repo writes no .gitignore', read(r8b, '.gitignore') === null);

// S09: FR-07 outside Git
scenario('S09-outside-git');
const r9 = newRepo('s09', { gitInit: false });
const a9 = cbj(r9, ['init', '--yes', '--json']);
check('S09 exit 0', a9.code === 0);
check('S09 no .gitignore', read(r9, '.gitignore') === null);
check('S09 GITIGNORE_NO_GIT finding', (a9.json?.findings ?? []).some((f) => f.code === 'GITIGNORE_NO_GIT'));
const t9 = cb(r9, ['init', '--dry-run']);
log(`text mentions GITIGNORE_NO_GIT: ${t9.stdout.includes('GITIGNORE_NO_GIT')}`);

// S10: FR-08 tracked files
scenario('S10-tracked-files');
const r10 = newRepo('s10', { gitignore: 'node_modules/\n' });
cbj(r10, ['init', '--yes', '--no-gitignore']);
git(r10, ['add', 'context-brake.config.json', '.gitignore']);
git(r10, ['commit', '-q', '-m', 'track config']);
const idxBefore = git(r10, ['ls-files', '-s']);
const a10 = cbj(r10, ['init', '--yes', '--json', '--gitignore']);
const f10 = (a10.json?.findings ?? []).find((f) => f.code === 'GITIGNORE_TRACKED_FILES');
log(`finding: ${JSON.stringify(f10)}`);
check('S10 GITIGNORE_TRACKED_FILES finding', f10 !== undefined);
check('S10 finding names exact git rm --cached command', JSON.stringify(f10 ?? {}).includes('git rm --cached -- context-brake.config.json'));
check('S10 finding severity ok', f10?.severity === 'ok');
const idxAfter = git(r10, ['ls-files', '-s']);
check('S10 index unchanged', idxBefore === idxAfter && git(r10, ['diff', '--cached', '--name-only']) === '');
const r10b = newRepo('s10b', { gitignore: 'node_modules/\n' });
const base10 = cbj(r10b, ['init', '--yes', '--json']);
check('S10 exit code equals untracked baseline', a10.code === base10.code && a10.json?.exitCode === base10.json?.exitCode, `tracked=${a10.code} baseline=${base10.code}`);
const t10 = cb(r10, ['init', '--dry-run']);
check('S10 text output shows the command', t10.stdout.includes('git rm --cached'));

// S11 (qa_02, DEC-HIL-06): FR-03 symlinked harness folder (.claude -> .agents); qa_01/BUG-01 rerun.
// Expected now: the block lists both the link path and the target path for each owned hook script.
scenario('S11-symlinked-harness');
const HOOKS = ['hooks/context-brake.mjs', 'hooks/context-brake-statusline.mjs'];
const ALLOWED = { junction: ['.agents/settings.json', '.agents/settings.local.json', '.claude/settings.json', '.claude/settings.local.json', '.gitignore'], dir: ['.agents/settings.json', '.agents/settings.local.json', '.claude', '.gitignore'] };
for (const type of ['junction', 'dir']) {
  const original11 = 'node_modules/\n';
  const r11 = newRepo(`s11-${type}`, { claude: false, gitignore: original11 });
  mkdirSync(join(r11, '.agents'));
  writeFileSync(join(r11, '.agents/settings.json'), '{\n  "hooks": {}\n}\n');
  try { symlinkSync(join(r11, '.agents'), join(r11, '.claude'), type); } catch (error) { log(`symlink type=${type} not creatable: ${error.code}`); check(`S11 ${type}: link creatable`, false, error.code); continue; }
  log(`link type=${type} created: .claude -> .agents`);
  const a11 = cbj(r11, ['init', '--yes']);
  check(`S11 ${type}: init exit 0`, a11.code === 0, `exit=${a11.code}`);
  const l11 = blockLines(read(r11, '.gitignore')) ?? [];
  log(`block (${type}): ${JSON.stringify(l11)}`);
  for (const hook of HOOKS) {
    check(`S11 ${type}: block lists link path /.claude/${hook}`, l11.includes(`/.claude/${hook}`));
    check(`S11 ${type}: block lists target path /.agents/${hook}`, l11.includes(`/.agents/${hook}`));
  }
  check(`S11 ${type}: no settings file in block (FR-03)`, !l11.some((l) => l.includes('settings')), JSON.stringify(l11));
  const st = git(r11, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean).map((x) => x.slice(3));
  check(`S11 ${type}: no owned file untracked (OBJ-01)`, st.every((p) => ALLOWED[type].includes(p)), JSON.stringify(st));
  for (const hook of HOOKS) {
    // Git treats a directory symlink as one entry, so a path through it is not probed (it reports "beyond a symbolic link").
    for (const prefix of type === 'junction' ? ['.claude', '.agents'] : ['.agents']) {
      const out = git(r11, ['check-ignore', '-v', '--no-index', `${prefix}/${hook}`]);
      check(`S11 ${type}: git check-ignore matches ${prefix}/${hook}`, out.includes(`${prefix}/${hook}`), JSON.stringify(out));
    }
  }
  const d11 = cb(r11, ['init', '--yes', '--dry-run', '--json']);
  check(`S11 ${type}: second run plans 0 changes (FR-02, NFR-01)`, d11.json !== null && (d11.json.plan.changes ?? []).length === 0, JSON.stringify((d11.json?.plan?.changes ?? []).map((c) => c.path)));
  const rm11 = cbj(r11, ['remove', '--yes']);
  check(`S11 ${type}: remove exit 0`, rm11.code === 0, `exit=${rm11.code}`);
  check(`S11 ${type}: remove restores .gitignore byte for byte (OBJ-05)`, Buffer.compare(readBytes(r11, '.gitignore'), Buffer.from(original11)) === 0, JSON.stringify(read(r11, '.gitignore')));
}

writeFileSync(join(process.env.QA_RUNS, 'json-docs.json'), JSON.stringify(jsonDocs));
process.exitCode = summary();
