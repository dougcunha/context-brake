import { afterEach, describe, expect, it } from 'vitest';
import { copyProject, makeProject, projectTree, removeProjects, replay, runAssisted, useProject } from '../helpers/assistant-world.js';

const DESELECT_CODEX = ['1', '', 'n', '', '', 'y'];

describe('FR-05 deselecting a detected harness equals --exclude-harness (prd-16, TC-09)', () => {
  const roots: string[] = [];
  afterEach(async () => { await removeProjects(...roots.splice(0)); });

  it('plans the same files as init --exclude-harness on a project that has not installed it (FR-05, TC-09)', async () => {
    const assisted = await makeProject();
    const typed = await copyProject(assisted);
    roots.push(assisted, typed);
    expect((await runAssisted(assisted, DESELECT_CODEX)).code).toBeLessThanOrEqual(1);
    expect((await replay(typed, ['--exclude-harness', 'codex-cli'], ['--yes'])).code).toBeLessThanOrEqual(1);
    const tree = await projectTree(assisted);
    expect(tree).toEqual(await projectTree(typed));
    expect(JSON.parse(tree['context-brake.config.json'] ?? '{}').excludedHarnesses).toEqual(['codex-cli']);
  });

  it('removes what an installed harness owns exactly as init --exclude-harness does (FR-05, TC-09)', async () => {
    const assisted = await makeProject();
    roots.push(assisted);
    expect((await replay(assisted, [], ['--yes'])).code).toBeLessThanOrEqual(1);
    const typed = await copyProject(assisted);
    roots.push(typed);
    const run = await runAssisted(assisted, DESELECT_CODEX);
    expect(run.code).toBeLessThanOrEqual(1);
    expect((await replay(typed, ['--exclude-harness', 'codex-cli'], ['--yes'])).code).toBeLessThanOrEqual(1);
    expect(await projectTree(assisted)).toEqual(await projectTree(typed));
    expect(run.stdout).toContain('--exclude-harness codex-cli');
  });
});

describe('FR-01, FR-05 typed harness flags do not change what the assistant shows (prd-16, TC-09)', () => {
  const project = useProject();

  it('lists a detected harness as marked even when --exclude-harness was typed with --interactive (FR-05, TC-09)', async () => {
    const run = await runAssisted(project(), [null], ['--interactive', '--exclude-harness', 'codex-cli']);
    expect(run.asked[0]).toMatch(/\[x\] codex-cli \(detected/);
  });
});
