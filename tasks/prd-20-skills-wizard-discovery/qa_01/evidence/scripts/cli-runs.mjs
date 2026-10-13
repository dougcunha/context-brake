import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, cp, stat } from 'node:fs/promises';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO = 'D:/MyProjects/ContextBrake';
const CLI = join(REPO, 'dist/src/cli/main.js');
const TRACE = process.argv[3];
const root = process.argv[2];
const evidence = process.argv[4];
const lines = [];
const say = (s = '') => { lines.push(s); };
let failures = 0;
const check = (label, ok, detail = '') => { if (!ok) failures++; say(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };

const FOLDERS = ['.claude/skills', '.agents/skills', '.cursor/skills', '.codex/skills', '.github/skills', '.opencode/skills', '.pi/skills', '.omp/skills'];
const skillText = (n, d) => `---\nname: ${n}\ndescription: ${d}\n---\n\nbody\n`;

async function project(label, { skills, folders }) {
  const dir = await mkdtemp(join(root, `cli-${label}-`));
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  for (const f of folders) {
    await mkdir(join(dir, f), { recursive: true });
    if (skills) {
      for (const [n, d] of [['sdd-snapshot', 'writes a checkpoint snapshot'], ['sdd-orchestrate-flow', 'resume the flow'], ['commit', 'commit and checkpoint helper']]) {
        await mkdir(join(dir, f, n), { recursive: true });
        await writeFile(join(dir, f, n, 'SKILL.md'), skillText(n, d));
      }
    } else await writeFile(join(dir, f, '.gitkeep'), '');
  }
  return dir;
}

async function tree(dir) {
  const out = {};
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      const rel = relative(dir, full).split(sep).join('/');
      if (/(^|\/)skills(\/|$)/.test(rel)) continue;
      if (e.isDirectory()) await walk(full);
      else out[rel] = await readFile(full, 'utf8');
    }
  }
  await walk(dir);
  return out;
}

const norm = (text, dir) => text.split(dir.split(sep).join('\\')).join('<ROOT>').split(dir).join('<ROOT>').split(dir.split(sep).join('/')).join('<ROOT>').replaceAll(/[A-Za-z]:[\\/][^\s"']*?cbqa-[^\s"'\\/]+/g, '<QAROOT>').replaceAll(/cli-[a-z-]+-[AB]-[A-Za-z0-9]{6}/g, '<PROJ>').replaceAll(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, '<TS>');

function run(dir, args, { trace = false, input = '' } = {}) {
  const env = { ...process.env };
  if (trace) env.CB_TRACE_LOG = TRACE;
  const nodeArgs = trace ? ['--import', 'file:///' + join(process.argv[1], '..', 'trace-fs.mjs').split(sep).join('/'), CLI, ...args] : [CLI, ...args];
  const r = spawnSync(process.execPath, nodeArgs, { cwd: dir, env, input, encoding: 'utf8', timeout: 120000 });
  return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const SCENARIOS = [
  ['init --yes', ['init', '--yes']],
  ['init --yes (second run)', ['init', '--yes']],
  ['init --yes --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow', ['init', '--yes', '--snapshot-command', 'sdd-snapshot', '--resume-command', 'sdd-orchestrate-flow']],
  ['init --yes --json', ['init', '--yes', '--json']],
  ['init --json --dry-run', ['init', '--json', '--dry-run']],
  ['init --dry-run --yes', ['init', '--dry-run', '--yes']],
  ['init --snapshot-command sdd-snapshot --yes --json', ['init', '--snapshot-command', 'sdd-snapshot', '--yes', '--json']],
];

const pairs = [
  ['claude-only', { skills: false, folders: [] }, { skills: true, folders: ['.claude/skills'] }],
  ['eight-folders', { skills: false, folders: FOLDERS }, { skills: true, folders: FOLDERS }],
];

for (const [name, a, b] of pairs) {
  say(`## Pair ${name}: without skills vs with skills (FR-07, TC-14)`);
  const A = await project(`${name}-A`, a);
  const B = await project(`${name}-B`, b);
  writeFileSync(TRACE, '');
  for (const [label, args] of SCENARIOS) {
    const ra = run(A, args);
    const rb = run(B, args, { trace: true });
    const sa = norm(ra.stdout, A);
    const sb = norm(rb.stdout, B);
    const ea = norm(ra.stderr, A);
    const eb = norm(rb.stderr, B);
    check(`${name} | ${label} | exit codes equal`, ra.code === rb.code, `A=${ra.code} B=${rb.code}`);
    check(`${name} | ${label} | stdout identical`, sa === sb);
    check(`${name} | ${label} | stderr identical`, ea === eb);
    if (label === 'init --yes --json' || label === 'init --json --dry-run') {
      let parsed = true;
      try { JSON.parse(rb.stdout); } catch { parsed = false; }
      check(`${name} | ${label} | stdout is valid JSON`, parsed);
    }
    if (sa !== sb) { writeFileSync(join(evidence, `diff-${name}-${label.replaceAll(/[^a-z0-9]+/gi, '_')}.A.txt`), sa); writeFileSync(join(evidence, `diff-${name}-${label.replaceAll(/[^a-z0-9]+/gi, '_')}.B.txt`), sb); }
    if (sa !== sb) say('  A stdout:\n' + sa.slice(0, 1500) + '\n  B stdout:\n' + sb.slice(0, 1500));
    writeFileSync(join(evidence, `cli-${name}-${label.replaceAll(/[^a-z0-9]+/gi, '_')}.txt`), `$ context-brake ${args.join(' ')}\nexit A=${ra.code} B=${rb.code}\n--- stdout (B, normalized) ---\n${sb}\n--- stderr (B, normalized) ---\n${eb}\n`);
  }
  const ta = await tree(A);
  const tb = await tree(B);
  const keysA = Object.keys(ta).sort();
  const keysB = Object.keys(tb).sort();
  const gitkeeps = (k) => k.filter((x) => !x.endsWith('.gitkeep'));
  check(`${name} | resulting files (outside skill folders) have the same names`, JSON.stringify(gitkeeps(keysA)) === JSON.stringify(gitkeeps(keysB)), `A=${gitkeeps(keysA).length} B=${gitkeeps(keysB).length}`);
  const differing = gitkeeps(keysA).filter((k) => norm(ta[k] ?? '', A) !== norm(tb[k] ?? '', B));
  check(`${name} | resulting file contents identical (normalized)`, differing.length === 0, differing.join(','));
  const log = readFileSync(TRACE, 'utf8').trim();
  check(`${name} | tracer saw no fs access to any path containing "skills" during all B runs`, log === '', log ? '\n' + log.split('\n').slice(0, 10).join('\n') : '');
  // skill folders themselves untouched
  const skillsStillThere = b.folders.every((f) => existsSync(join(B, f, 'sdd-snapshot/SKILL.md')));
  check(`${name} | skill folders left intact`, skillsStillThere);
}

say('\n## Tracer positive control: the tracer must see the reader scanning');
writeFileSync(TRACE, '');
const probeDir = await project('probe', { skills: true, folders: ['.claude/skills'] });
const probe = join(root, 'probe-reader.mjs');
writeFileSync(probe, `import { createSkillCatalogReader } from 'file:///${REPO}/dist/src/infrastructure/skills/skill-catalog.js';\nconst r = await createSkillCatalogReader()('claude-code', ${JSON.stringify(probeDir)});\nconsole.log(r.skills.map((s) => s.name).join(','));\n`);
const pr = spawnSync(process.execPath, ['--import', 'file:///' + join(process.argv[1], '..', 'trace-fs.mjs').split(sep).join('/'), probe], { env: { ...process.env, CB_TRACE_LOG: TRACE }, encoding: 'utf8' });
const plog = readFileSync(TRACE, 'utf8').trim();
check('positive control: reader output seen', pr.stdout.includes('sdd-snapshot'), pr.stdout.trim() + pr.stderr.slice(0, 200));
check('positive control: tracer recorded skills-folder access', plog.split('\n').filter(Boolean).length > 0, `${plog.split('\n').filter(Boolean).length} events; e.g. ${plog.split('\n')[0]}`);

say('\n## Non-interactive wizard request');
const C = await project('interactive', { skills: true, folders: ['.claude/skills'] });
for (const args of [['init', '--interactive'], ['init']]) {
  const r = run(C, args);
  say(`$ context-brake ${args.join(' ')}  (stdin piped, not a TTY)\nexit=${r.code}\nstdout: ${norm(r.stdout, C).slice(0, 400)}\nstderr: ${norm(r.stderr, C).slice(0, 400)}`);
  writeFileSync(join(evidence, `cli-nontty-${args.join('_').replaceAll('-', '')}.txt`), `$ context-brake ${args.join(' ')}\nexit=${r.code}\n--- stdout ---\n${norm(r.stdout, C)}\n--- stderr ---\n${norm(r.stderr, C)}\n`);
}

console.log(lines.join('\n'));
console.log(`\nFAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
