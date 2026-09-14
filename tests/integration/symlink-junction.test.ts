import { lstat, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { planInstructionChanges } from '../../src/core/services/instruction-service.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';

describe('symlink and junction instruction targets (IT-05, CA-07, CA-20)', () => {
  it('writes real target once and preserves symbolic link (IT-05, CA-07)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-symlink-'));
    try {
      const claudePath = join(dir, 'CLAUDE.md');
      const agentsPath = join(dir, 'AGENTS.md');
      await writeFile(claudePath, '# Instructions\n', 'utf8');
      try {
        await symlink('CLAUDE.md', agentsPath);
      } catch {
        return;
      }
      const snapshots = await snapshotFiles(dir, ['CLAUDE.md', 'AGENTS.md']);
      const { changes, conflicts } = planInstructionChanges({ snapshots, config: DEFAULT_CONFIG });
      const plan = createChangePlan({ projectRoot: dir, plannedChanges: changes, conflicts, snapshots });
      const applier = new NodeChangeApplier();
      const report = await applier.apply(plan);
      expect(report.status).toBe('success');
      const claudeContent = await readFile(claudePath, 'utf8');
      expect(claudeContent.match(/<!-- CONTEXTBRAKE:START -->/g)).toHaveLength(1);
      const linkStat = await lstat(agentsPath);
      expect(linkStat.isSymbolicLink()).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
