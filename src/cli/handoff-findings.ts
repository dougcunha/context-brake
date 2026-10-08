import { resolve } from 'node:path';
import type { HarnessAdapter } from '../core/contracts/adapter.js';
import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import type { DiagnosticFinding } from '../core/contracts/diagnostics.js';
import { HANDOFF_ARCHIVE_RELATIVE_DIR, HANDOFF_RELATIVE_PATH } from '../core/contracts/handoff.js';
import { handoffKeptFinding, restartDoctorFindings } from '../core/services/restart-doctor-findings.js';
import { pathExists } from '../infrastructure/harnesses/common/path-helpers.js';
import { systemClock } from '../infrastructure/runtime/runtime-composition.js';
import { NodeHandoffStore } from '../infrastructure/storage/node-handoff-store.js';

export async function keptHandoffFindings(projectRoot: string): Promise<DiagnosticFinding[]> {
  const candidates = [HANDOFF_RELATIVE_PATH, `${HANDOFF_ARCHIVE_RELATIVE_DIR}/`];
  const present = await Promise.all(candidates.map((path) => pathExists(resolve(projectRoot, path))));
  return handoffKeptFinding(candidates.filter((_path, index) => present[index]));
}

export async function doctorRestartFindings(projectRoot: string, config: ContextBrakeConfig | null, installed: readonly HarnessAdapter[]): Promise<DiagnosticFinding[]> {
  const handoffPending = (await new NodeHandoffStore(projectRoot, systemClock).pendingSince()) !== null;
  return restartDoctorFindings({ config, installed, handoffPending });
}
