import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, cli, EVIDENCE, FIX, hook, makeRepo, note, read, results, tree, write } from './lib.mjs';

const RESUME = /\[ContextBrake resume v1\] Read \\?"(\.context-brake\/handoffs\/\d{8}T\d{6}\.\d{3}Z(?:-\d+)?\.md)\\?" and continue the previous work from it\./;
const STARTS = {
  'claude-code': { hook: '.claude/hooks/context-brake.mjs', event: 'SessionStart', fixture: 'claude-code/session-start.json', sources: { startup: 'startup', clear: 'clear', compact: 'compact' } },
  'codex-cli': { hook: '.codex/hooks/context-brake.mjs', event: 'SessionStart', fixture: 'codex-cli/session-start.json', sources: { startup: 'startup', clear: 'clear', compact: 'compact' } },
  cursor: { hook: '.cursor/hooks/context-brake.mjs', event: 'sessionStart', fixture: 'cursor/session-start.json', sources: { startup: undefined } },
  'github-copilot-cli': { hook: '.github/hooks/context-brake.mjs', event: 'sessionStart', fixture: 'github-copilot-cli/session-start.json', sources: { startup: 'new' } },
};
async function payload(spec, source) {
  const base = JSON.parse(await readFile(join(FIX, spec.fixture), 'utf8'));
  if (source !== undefined) base.source = source;
  return base;
}
const archived = async (root) => (await tree(root)).filter((f) => f.startsWith('.context-brake/handoffs/') && f.endsWith('.md'));

// FR-02, FR-03, FR-08, NFR-05: session-start delivery on every session_boot process-hook harness
for (const [harness, spec] of Object.entries(STARTS)) {
  for (const [kind, source] of Object.entries(spec.sources)) {
    const sc = `start-${harness}-${kind}`;
    const ev = `session-start-${harness}.txt`;
    if (kind === Object.keys(spec.sources)[0]) await writeFile(join(EVIDENCE, ev), `# Built ${harness} session-start hook with a pending handoff (FR-02, FR-03, FR-08, NFR-05, TC-02, TC-10)\n`);
    await note(ev, `scenario ${sc}`);
    const repo = await makeRepo(sc, [harness]);
    await cli(repo, ['init', '--yes', '--auto-restart'], ev);
    await write(join(repo.root, '.context-brake/handoff.md'), '# Goal\nfinish QA\n');
    const first = await hook(repo, spec.hook, spec.event, await payload(spec, source), ev);
    const match = RESUME.exec(first.stdout);
    if (kind === 'compact') {
      check(sc, 'compact neither claims nor injects', first.code === 0 && match === null && (await read(join(repo.root, '.context-brake/handoff.md'))) !== null, first.stdout);
      continue;
    }
    check(sc, 'first start injects the resume instruction with the archived path', first.code === 0 && match !== null, `exit=${first.code} ${first.stdout} ${first.stderr}`);
    if (match === null) continue;
    check(sc, 'handoff.md moved to the named archive file with its content', (await read(join(repo.root, '.context-brake/handoff.md'))) === null && (await read(join(repo.root, match[1]))) === '# Goal\nfinish QA\n');
    const second = await hook(repo, spec.hook, spec.event, await payload(spec, source), ev);
    check(sc, 'second start injects no resume instruction (one delivery)', second.code === 0 && !second.stdout.includes('[ContextBrake resume v1]'), second.stdout);
  }
}

// FR-03 archive limit; DEC-02 name clash
{
  const sc = 'archive-limit';
  const ev = 'session-start-archive-limit.txt';
  await writeFile(join(EVIDENCE, ev), '# Archive limit 10 through the built Claude Code session-start hook (FR-03, TC-03)\n');
  const repo = await makeRepo(sc, ['claude-code']);
  await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  for (let i = 0; i < 10; i += 1) await write(join(repo.root, `.context-brake/handoffs/20260101T0000${String(i).padStart(2, '0')}.000Z.md`), `# A${i}\n`);
  for (let round = 1; round <= 2; round += 1) {
    await write(join(repo.root, '.context-brake/handoff.md'), `# Round ${round}\n`);
    const res = await hook(repo, STARTS['claude-code'].hook, 'SessionStart', await payload(STARTS['claude-code'], 'clear'), ev);
    const match = RESUME.exec(res.stdout);
    const files = await archived(repo.root);
    check(sc, `round ${round}: archive holds 10 files, the delivered one included, oldest pruned`, match !== null && files.length === 10 && files.includes(match[1]) && !files.includes(`.context-brake/handoffs/20260101T0000${String(round - 1).padStart(2, '0')}.000Z.md`), JSON.stringify(files));
    await note(ev, `round ${round} archive: ${files.join(', ')}`);
  }
}

// NFR-05: restart off delivers nothing
{
  const sc = 'start-restart-off';
  const ev = 'session-start-restart-off.txt';
  await writeFile(join(EVIDENCE, ev), '# Restart off: pending handoff is neither claimed nor injected (NFR-05, TC-02)\n');
  for (const harness of ['claude-code', 'codex-cli']) {
    const repo = await makeRepo(`${sc}-${harness}`, [harness]);
    await cli(repo, ['init', '--yes'], ev);
    await write(join(repo.root, '.context-brake/handoff.md'), '# Goal\n');
    const res = await hook(repo, STARTS[harness].hook, 'SessionStart', await payload(STARTS[harness], 'clear'), ev);
    check(`${sc}-${harness}`, 'no resume, handoff stays pending', res.code === 0 && !res.stdout.includes('resume v1') && (await read(join(repo.root, '.context-brake/handoff.md'))) === '# Goal\n', res.stdout);
  }
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}
function findBlock(stdout) {
  try { return strings(JSON.parse(stdout)).find((s) => s.startsWith('[ContextBrake v3]'))?.split('\n')[0] ?? ''; } catch { return ''; }
}
// FR-01 telemetry action through the built Codex post-tool hook
async function telemetry(label, initArgs) {
  const ev = 'telemetry-action.txt';
  await note(ev, `case ${label}: init ${initArgs.join(' ')}`);
  const repo = await makeRepo(`tele-${label}`, ['codex-cli']);
  await cli(repo, ['init', '--yes', ...initArgs], ev);
  const configPath = join(repo.root, 'context-brake.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.telemetry.injectionMode = 'always';
  config.telemetry.zones = { ...config.telemetry.zones, greenMaxTurn: 1, yellowMaxTurn: 2, criticalTurn: 4 };
  await writeFile(configPath, JSON.stringify(config, null, 2));
  await note(ev, `config telemetry: ${JSON.stringify(config.telemetry)} autoRestart=${JSON.stringify(config.autoRestart)} snapshot=${JSON.stringify(config.snapshot)}`);
  const base = JSON.parse(await readFile(join(FIX, 'codex-cli/post-tool-use.json'), 'utf8'));
  const blocks = {};
  for (let turn = 1; turn <= 6; turn += 1) {
    const res = await hook(repo, '.codex/hooks/context-brake.mjs', 'PostToolUse', { ...base, tool_use_id: `qa-${turn}`, turn_id: `qa-turn-${turn}` }, ev);
    const block = findBlock(res.stdout);
    const zone = /zone=(\w+)/.exec(block)?.[1];
    if (zone) blocks[zone] = block;
  }
  config.telemetry.contextWindowCeiling = 18000;
  await writeFile(configPath, JSON.stringify(config, null, 2));
  await note(ev, 'contextWindowCeiling lowered to 18000 to reach CRITICAL by percentage');
  const crit = await hook(repo, '.codex/hooks/context-brake.mjs', 'PostToolUse', { ...base, tool_use_id: 'qa-crit', turn_id: 'qa-turn-crit' }, ev);
  const block = findBlock(crit.stdout);
  const zone = /zone=(\w+)/.exec(block)?.[1];
  if (zone) blocks[zone] = block;
  return blocks;
}
await writeFile(join(EVIDENCE, 'telemetry-action.txt'), '# Telemetry action at RED and CRITICAL through the built Codex PostToolUse hook (FR-01, NFR-05, TC-01)\n');
const ACTION = 'action=save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]';
const on = await telemetry('handoff', ['--auto-restart']);
check('telemetry', 'handoff mode RED and CRITICAL carry the handoff path and the marker', on.RED?.endsWith(ACTION) && on.CRITICAL?.endsWith(ACTION), JSON.stringify(on));
check('telemetry', 'handoff mode YELLOW keeps the generic action', on.YELLOW !== undefined && !on.YELLOW.includes('handoff'), on.YELLOW);
const off = await telemetry('off', []);
check('telemetry', 'restart off: RED and CRITICAL contain neither handoff path nor marker', off.RED !== undefined && off.CRITICAL !== undefined && !JSON.stringify(off).includes('handoff') && !JSON.stringify(off).includes('REQUEST_SESSION_RESET'), JSON.stringify(off));
const snap = await telemetry('snapshot', ['--auto-restart', '--snapshot-command', '/sdd-snapshot']);
check('telemetry', 'snapshot mode RED names the skill, not the handoff', snap.RED?.includes('run "/sdd-snapshot"') && !snap.RED.includes('handoff'), JSON.stringify(snap));
await note('telemetry-action.txt', `blocks: ${JSON.stringify({ on, off, snap })}`);

// FR-08, FR-12, DEC-18: Codex Stop notice
{
  const ev = 'codex-stop-notice.txt';
  await writeFile(join(EVIDENCE, ev), '# Built Codex Stop hook: reset notice and marker detection (FR-08, FR-12, DEC-18, TC-11)\n');
  const base = JSON.parse(await readFile(join(FIX, 'codex-cli/stop.json'), 'utf8'));
  const cases = [['alone', '[REQUEST_SESSION_RESET]', true], ['own-line', 'Saved the handoff.\n[REQUEST_SESSION_RESET]', true], ['same-line', 'Saved the handoff. [REQUEST_SESSION_RESET]', true], ['mid-reply', '[REQUEST_SESSION_RESET]\nthen more text', false]];
  for (const mode of ['on', 'off']) {
    const repo = await makeRepo(`stop-${mode}`, ['codex-cli']);
    await cli(repo, ['init', '--yes', ...(mode === 'on' ? ['--auto-restart'] : [])], ev);
    for (const [label, text, fires] of cases) {
      const res = await hook(repo, '.codex/hooks/context-brake.mjs', 'Stop', { ...base, last_assistant_message: text }, ev);
      const notice = res.stdout.includes('requested a session reset');
      check(`stop-${mode}`, `${label}: notice ${fires ? 'fires' : 'does not fire'}`, res.code === 0 && notice === fires, res.stdout);
      if (fires && notice) {
        const named = res.stdout.includes('Run /new to start a new session; it resumes by itself.');
        check(`stop-${mode}`, `${label}: notice ${mode === 'on' ? 'names /new with the resume suffix' : 'keeps the restart-off text'}`, mode === 'on' ? named : !named, res.stdout);
      }
    }
  }
}

await writeFile(join(EVIDENCE, 'hook-scenarios-results.json'), JSON.stringify(results, null, 1));
console.log(`\nTOTAL ${results.length} checks, ${results.filter((r) => !r.ok).length} failed`);
