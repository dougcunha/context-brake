import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';
import { readSkillFolders } from '../../src/infrastructure/skills/skill-catalog-reader.js';

const FOLDER = '.agents/skills';
const SKILL_COUNT = 200;
const SAMPLE_COUNT = 20;
const WARMUP_COUNT = 2;
const TARGET_MS = 500;
let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-skills-bench-'));
  await Promise.all(Array.from({ length: SKILL_COUNT }, async (_, index) => {
    const directory = join(root, FOLDER, `skill-${String(index).padStart(3, '0')}`);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'SKILL.md'), `---\nname: skill-${String(index).padStart(3, '0')}\ndescription: ${'word '.repeat(40)}\n---\n\n${'body '.repeat(2000)}\n`);
  }));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('skill catalog scan of 200 skills (prd-20 NFR-02, TC-10)', () => {
  it('finishes within 500 ms at the 95th percentile', async () => {
    for (let warm = 0; warm < WARMUP_COUNT; warm += 1) await readSkillFolders(root, [FOLDER]);
    const samples: number[] = [];
    for (let run = 0; run < SAMPLE_COUNT; run += 1) {
      const start = performance.now();
      const { skills } = await readSkillFolders(root, [FOLDER]);
      samples.push(performance.now() - start);
      expect(skills).toHaveLength(SKILL_COUNT);
    }
    expect(calculateNearestRankP95(samples)).toBeLessThan(TARGET_MS);
  });
});
