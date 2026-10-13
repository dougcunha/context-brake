import { mkdtemp, mkdir, writeFile, symlink, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = 'D:/MyProjects/ContextBrake';
const dist = (p) => import(pathToFileURL(join(REPO, 'dist', p)).href);
const root = process.argv[2];
const out = [];
let failures = 0;
const check = (label, ok, detail = '') => { if (!ok) failures++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };

const { HARNESS_IDS } = await dist('src/core/contracts/harness.js');
const { createSkillCatalogReader } = await dist('src/infrastructure/skills/skill-catalog.js');
const { resolveSkillFolders } = await dist('src/infrastructure/harnesses/skill-folders.js');
const { MAX_SKILL_DIRECTORIES, MAX_FRONTMATTER_BYTES } = await dist('src/infrastructure/skills/skill-catalog-reader.js');
const { mergeCatalogs } = await dist('src/core/services/skill-candidates.js');
const { rankSkills } = await dist('src/core/services/skill-ranking.js');
const reader = createSkillCatalogReader();

const TABLE = {
  'claude-code': ['.claude/skills'],
  'codex-cli': ['.agents/skills'],
  cursor: ['.cursor/skills', '.agents/skills', '.claude/skills', '.codex/skills'],
  'github-copilot-cli': ['.github/skills', '.claude/skills', '.agents/skills'],
  opencode: ['.opencode/skills', '.claude/skills', '.agents/skills'],
  pi: ['.pi/skills', '.agents/skills'],
  'oh-my-pi': ['.omp/skills', '.github/skills', '.agents/skills'],
  'antigravity-cli': ['.agents/skills'],
};
const skill = (name, description = 'does a thing') => `---\nname: ${name}\ndescription: ${description}\n---\n\nbody that must never be read\n`;
const put = async (proj, folder, dir, text) => { await mkdir(join(proj, folder, dir), { recursive: true }); await writeFile(join(proj, folder, dir, 'SKILL.md'), text); };

out.push('## Section 1. Eight harness folders (FR-01, OBJ-03, TC-01)');
check('HARNESS_IDS has eight ids', HARNESS_IDS.length === 8, HARNESS_IDS.join(','));
for (const h of HARNESS_IDS) {
  const declared = [...resolveSkillFolders(h)];
  check(`${h}: declared folders equal TechSpec table`, JSON.stringify(declared) === JSON.stringify(TABLE[h]), declared.join(' | '));
  const proj = await mkdtemp(join(root, `fx-${h}-`));
  const empty = await reader(h, proj);
  check(`${h}: project without folders -> empty, no warnings`, empty.skills.length === 0 && empty.warnings.length === 0);
  for (const [i, f] of declared.entries()) await put(proj, f, `skill-${i}`, skill(`skill-${i}`, `from ${f}`));
  const cat = await reader(h, proj);
  const names = cat.skills.map((s) => s.name).sort();
  const expected = declared.map((_, i) => `skill-${i}`).sort();
  check(`${h}: reads every declared folder`, JSON.stringify(names) === JSON.stringify(expected), names.join(','));
  check(`${h}: folder field is project-relative with forward slashes`, cat.skills.every((s) => declared.includes(s.folder)), cat.skills.map((s) => s.folder).join(' | '));
  check(`${h}: no warnings`, cat.warnings.length === 0, cat.warnings.join(';'));
  const others = ['.claude/skills', '.agents/skills', '.cursor/skills', '.github/skills', '.opencode/skills', '.pi/skills', '.omp/skills', '.codex/skills', '.gemini/skills'].filter((f) => !declared.includes(f));
  const proj2 = await mkdtemp(join(root, `fx-other-${h}-`));
  for (const f of others) await put(proj2, f, 'foreign', skill('foreign'));
  const cat2 = await reader(h, proj2);
  check(`${h}: folders of other harnesses are not read`, cat2.skills.length === 0, others.join(','));
}

out.push('\n## Section 2. Reader edge cases (FR-02, NFR-04, TC-02, TC-12)');
const p = await mkdtemp(join(root, 'fx-edge-'));
const F = '.claude/skills';
await put(p, F, 'good', skill('good', 'ok'));
await put(p, F, 'no-frontmatter', '# Just a title\nname: nope\n');
await put(p, F, 'broken', '---\nname: [unclosed\n');
await put(p, F, 'slash', skill('a/b'));
await put(p, F, 'spaces', skill('a b'));
await put(p, F, 'dollar', skill('$x'));
await put(p, F, 'upper', skill('Upper'));
await put(p, F, 'fallback', '---\ndescription: no name key\n---\n');
await put(p, F, 'quoted', '---\nname: "quoted-name"\ndescription: \'single quoted\'\n---\n');
await put(p, F, 'crlf', '---\r\nname: crlf-skill\r\ndescription: windows\r\n---\r\n');
await put(p, F, 'bom', '\uFEFF---\nname: bom-skill\n---\n');
await put(p, F, 'block', '---\nname: block-skill\ndescription: >\n  folded text snapshot\n---\n');
await put(p, F, 'namespaced', skill('plugin:ns-skill'));
await put(p, F, 'late-name', '---\ndescription: x\n' + '#pad\n'.repeat(3000) + 'name: too-late\n---\n');
await mkdir(join(p, F, 'no-skill-md'), { recursive: true });
await mkdir(join(p, F, 'skillmd-is-dir', 'SKILL.md'), { recursive: true });
await writeFile(join(p, F, 'loose-file.md'), skill('loose'));
const edge = await reader('claude-code', p);
const en = edge.skills.map((s) => s.name).sort();
const want = ['block-skill', 'bom-skill', 'crlf-skill', 'fallback', 'good', 'late-name', 'no-frontmatter', 'plugin:ns-skill', 'quoted-name'].sort();
out.push('edge names: ' + en.join(', ') + ' | warnings: ' + JSON.stringify(edge.warnings));
check('valid names kept, invalid or malformed ignored without failure', JSON.stringify(en) === JSON.stringify(want));
check('name beyond 8 KiB is not read (folder name used)', en.includes('late-name') && !en.includes('too-late'));
check('block scalar description is empty', edge.skills.find((s) => s.name === 'block-skill')?.description === '');
check('quoted description unquoted', edge.skills.find((s) => s.name === 'quoted-name')?.description === 'single quoted');
check('SKILL.md as a directory handled without crash', true, `warnings=${JSON.stringify(edge.warnings)}`);

const target = join(p, 'real-skills', 'linked-target');
await mkdir(target, { recursive: true });
await writeFile(join(target, 'SKILL.md'), skill('linked-skill'));
const linkMade = [];
for (const type of ['dir', 'junction']) {
  const link = join(p, F, `link-${type}`);
  try { await symlink(target, link, type); linkMade.push(type); } catch (e) { out.push(`SKIP  ${type} link not creatable: ${e.code}`); }
}
try { await symlink(join(p, 'does-not-exist'), join(p, F, 'broken-link'), 'junction'); } catch { out.push('SKIP  broken junction not creatable'); }
const linked = await reader('claude-code', p);
const lnames = linked.skills.map((s) => s.name);
check(`symlink/junction resolves (created: ${linkMade.join('+') || 'none'})`, linkMade.length === 0 || lnames.includes('linked-skill'), lnames.filter((n) => n.includes('link')).join(','));
out.push('after links: warnings=' + JSON.stringify(linked.warnings));

const big = await mkdtemp(join(root, 'fx-big-'));
for (let i = 0; i < 1000; i++) await put(big, F, `s${String(i).padStart(4, '0')}`, skill(`s${String(i).padStart(4, '0')}`));
const t0 = performance.now();
const bigCat = await reader('claude-code', big);
const ms = Math.round(performance.now() - t0);
check(`1000 directories bounded to MAX_SKILL_DIRECTORIES=${MAX_SKILL_DIRECTORIES}`, bigCat.skills.length === MAX_SKILL_DIRECTORIES, `got ${bigCat.skills.length} in ${ms} ms`);
check('bounded set is the first 500 in name order', bigCat.skills.every((s) => s.name < 's0500'));
const mb = await mkdtemp(join(root, 'fx-mb-'));
await put(mb, F, 'huge', '---\nname: huge-skill\ndescription: big file\n---\n' + 'x'.repeat(1024 * 1024));
const mbCat = await reader('claude-code', mb);
check('1 MB SKILL.md yields its name from the frontmatter', mbCat.skills.length === 1 && mbCat.skills[0].name === 'huge-skill');
check('MAX_FRONTMATTER_BYTES is 8192', MAX_FRONTMATTER_BYTES === 8192);

out.push('\n## Section 3. Realistic project: copy of this repository skills (OBJ-01, OBJ-04, US-02, FR-03, FR-04, FR-06)');
const real = await mkdtemp(join(root, 'fx-real-'));
await mkdir(join(real, '.claude'), { recursive: true });
await cp(join(REPO, '.agents/skills'), join(real, '.claude/skills'), { recursive: true });
await mkdir(join(real, '.agents'), { recursive: true });
await cp(join(REPO, '.agents/skills'), join(real, '.agents/skills'), { recursive: true });
await rm(join(real, '.agents/skills/ts-tests'), { recursive: true, force: true });
const show = (list) => list.map((c) => `${c.name} [${c.origins.map((o) => `${o.harness}:${o.folder}`).join(', ')}]`);
const sel = ['claude-code', 'codex-cli'];
const merged = mergeCatalogs(await Promise.all(sel.map(async (h) => ({ harness: h, skills: (await reader(h, real)).skills }))));
const snap = rankSkills('snapshot', merged);
out.push('snapshot ranking: ' + show(snap).join('\n   > '));
check('snapshot first = sdd-snapshot', snap[0]?.name === 'sdd-snapshot');
check('commit and sdd-triage are not first', !['commit', 'sdd-triage'].includes(snap[0]?.name ?? ''));
const resume = rankSkills('resume', merged, { exclude: 'sdd-snapshot' });
out.push('resume ranking (exclude sdd-snapshot): ' + show(resume).join('\n   > '));
check('resume first = sdd-orchestrate-flow', resume[0]?.name === 'sdd-orchestrate-flow');
check('snapshot skill absent from the resume list', !resume.some((c) => c.name === 'sdd-snapshot'));
check('sdd-snapshot found in both selected harnesses', merged.find((c) => c.name === 'sdd-snapshot')?.origins.length === 2);
check('ts-tests (only in the claude folder) has one origin', merged.find((c) => c.name === 'ts-tests')?.origins.length === 1);

console.log(out.join('\n'));
console.log(`\nFAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
