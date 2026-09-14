import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { DetectionEvidence } from '../../../core/contracts/harness.js';

export async function pathExists(fullPath: string): Promise<boolean> {
  try {
    const s = await stat(fullPath);
    return s.isFile() || s.isDirectory();
  } catch {
    return false;
  }
}

export async function isDirectory(fullPath: string): Promise<boolean> {
  try {
    const s = await stat(fullPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export function getUserHome(userHome?: string): string {
  return userHome && userHome.trim().length > 0 ? userHome : homedir();
}

export async function checkProjectEvidence(
  projectRoot: string,
  files: readonly string[],
  dirs: readonly string[] = []
): Promise<DetectionEvidence[]> {
  const evidence: DetectionEvidence[] = [];
  for (const f of files) {
    const p = resolve(projectRoot, f);
    if (await pathExists(p)) {
      evidence.push({ origin: 'project', kind: 'config', value: f });
    }
  }
  for (const d of dirs) {
    const p = resolve(projectRoot, d);
    if (await isDirectory(p)) {
      evidence.push({ origin: 'project', kind: 'directory', value: d });
    }
  }
  return evidence;
}

export async function checkUserEvidence(
  files: readonly string[],
  userHome?: string
): Promise<DetectionEvidence[]> {
  const base = getUserHome(userHome);
  const evidence: DetectionEvidence[] = [];
  for (const f of files) {
    const p = join(base, f);
    if (await pathExists(p)) {
      evidence.push({ origin: 'machine', kind: 'user_config', value: f });
    }
  }
  return evidence;
}
