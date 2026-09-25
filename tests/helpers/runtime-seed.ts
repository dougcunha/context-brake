import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const CRITICAL_CHARACTERS_PER_TURN = 40000;
const CRITICAL_SEED_TURNS = 12;
export const fixedClock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };

export async function writeRuntimeConfig(projectRoot: string, contextWindowCeiling = 24000): Promise<void> {
  const config = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, contextWindowCeiling } };
  await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

export async function writeInvalidRuntimeConfig(projectRoot: string): Promise<void> {
  const config = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 11 } } };
  await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

export async function seedTurns(projectRoot: string, key: SessionKey, turns: number): Promise<void> {
  const ledger = new NodeSessionLedger(projectRoot, fixedClock);
  for (let turn = 1; turn <= turns; turn += 1) {
    await ledger.appendToolLine(key, toolLine(turn));
  }
}

function toolLine(turn: number, observedCharacters = 0): ToolLineInput {
  return { toolUseId: `seed-${turn}`, observedCharacters, turn, usedTokens: 16000, windowTokens: 24000, estimatedTokens: 16000, source: 'estimated', zone: 'CRITICAL' };
}

export async function seedCriticalSession(projectRoot: string, key: SessionKey): Promise<void> {
  const ledger = new NodeSessionLedger(projectRoot, fixedClock);
  for (let turn = 1; turn <= CRITICAL_SEED_TURNS; turn += 1) {
    await ledger.appendToolLine(key, toolLine(turn, CRITICAL_CHARACTERS_PER_TURN));
  }
}
