import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { planInstructionChanges } from '../../src/core/services/instruction-service.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';

describe('existing-only instruction policy (IT-06, CA-08, CA-09)', () => {
  it('updates existing instruction files and leaves absent targets absent (IT-06)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-existing-'));
    try {
      const claudePath = join(dir, 'CLAUDE.md');
      const agentsPath = join(dir, 'AGENTS.md');
      await writeFile(claudePath, '# Existing Claude\n', 'utf8');
      const snaps = await snapshotFiles(dir, ['CLAUDE.md', 'AGENTS.md']);
      const { changes, conflicts } = planInstructionChanges({ snapshots: snaps, config: DEFAULT_CONFIG, createInstructions: false });
      const plan = createChangePlan({ projectRoot: dir, plannedChanges: changes, conflicts, snapshots: snaps });
      const applier = new NodeChangeApplier();
      await applier.apply(plan);
      const claude = await readFile(claudePath, 'utf8');
      expect(claude).toContain('<!-- CONTEXTBRAKE:START -->');
      const agentsStat = await stat(agentsPath).catch(() => null);
      expect(agentsStat).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('legacy preview and migration (IT-07, CA-10)', () => {
  const original = '# Title\n<!-- CONTEXTOPS:START -->\nKeep my note.\n## [PROTOCOL] Gestão Autônoma\n<!-- CONTEXTOPS:END -->\n# Tail\n';

  it('preview writes nothing and migration preserves non-protocol text (IT-07)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-legacy-'));
    try {
      const agentsPath = join(dir, 'AGENTS.md');
      await writeFile(agentsPath, original, 'utf8');
      const previewSnaps = await snapshotFiles(dir, ['AGENTS.md']);
      const previewRes = planInstructionChanges({ snapshots: previewSnaps, config: DEFAULT_CONFIG, migrateLegacy: false });
      expect(previewRes.changes).toHaveLength(0);
      expect(await readFile(agentsPath, 'utf8')).toBe(original);
      const migrateSnaps = await snapshotFiles(dir, ['AGENTS.md']);
      const migrateRes = planInstructionChanges({ snapshots: migrateSnaps, config: DEFAULT_CONFIG, migrateLegacy: true });
      const plan = createChangePlan({ projectRoot: dir, plannedChanges: migrateRes.changes, conflicts: migrateRes.conflicts, snapshots: migrateSnaps });
      const applier = new NodeChangeApplier();
      await applier.apply(plan);
      const migrated = await readFile(agentsPath, 'utf8');
      expect(migrated).toContain('# Title');
      expect(migrated).toContain('Keep my note.');
      expect(migrated).toContain('<!-- CONTEXTBRAKE:START -->');
      expect(migrated).toContain('# Tail');
      expect(migrated).not.toContain('Gestão Autônoma');
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
