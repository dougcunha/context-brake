import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { InstallationManifest } from '../contracts/manifest.js';
import { CURRENT_END_MARKER, CURRENT_START_MARKER } from './instruction-markers.js';

export function removeReferenceFromBody(content: string): string {
  const s = content.indexOf(CURRENT_START_MARKER);
  const e = content.indexOf(CURRENT_END_MARKER);
  if (s === -1 || e === -1 || s >= e) return content;
  const endIdx = e + CURRENT_END_MARKER.length;
  let before = content.slice(0, s);
  let after = content.slice(endIdx);
  if (before.endsWith('\r\n')) before = before.slice(0, -2);
  else if (before.endsWith('\n')) before = before.slice(0, -1);
  if (after.startsWith('\r\n')) after = after.slice(2);
  else if (after.startsWith('\n')) after = after.slice(1);
  if (!before && !after) return '';
  if (!before) return after;
  if (!after) return `${before}\n`;
  const sep = content.includes('\r\n') ? '\r\n' : '\n';
  return `${before}${sep}${after}`;
}

export function planInstructionRemoval(snapshots: readonly FileSnapshot[]): PlannedChange[] {
  const changes: PlannedChange[] = [];
  for (const snap of snapshots) {
    if (!snap.exists || !snap.content?.includes(CURRENT_START_MARKER)) continue;
    const updated = removeReferenceFromBody(snap.content);
    changes.push({
      path: snap.path,
      realPath: snap.realPath,
      kind: 'update',
      owner: 'instruction_block',
      content: updated,
      preview: { summary: 'Remove ContextBrake reference block' },
    });
  }
  return changes;
}

export function planAssetDeletions(manifest: InstallationManifest | null, snapshots: readonly FileSnapshot[]): { changes: PlannedChange[]; conflicts: PlanConflict[] } {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  if (!manifest) return { changes, conflicts };
  for (const asset of manifest.assets) {
    const snap = snapshots.find((s) => s.path === asset.path);
    if (!snap || !snap.exists) continue;
    if (snap.sha256 !== asset.sha256) {
      conflicts.push({ path: asset.path, code: 'MODIFIED_OWNED_ASSET', detail: 'Asset was modified since installation and will not be removed' });
      continue;
    }
    changes.push({ path: asset.path, realPath: snap.realPath, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: `Delete ${asset.path}` } });
  }
  return { changes, conflicts };
}
