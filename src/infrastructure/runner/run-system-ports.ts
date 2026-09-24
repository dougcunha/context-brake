import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { BootTokenEstimator, Timer } from '../../core/contracts/run-control.js';
import type { Hasher, SessionCommand, SessionLauncher, SessionRequest } from '../../core/contracts/run-ports.js';
import type { Clock } from '../../core/contracts/session-ledger.js';
import { CHARACTERS_PER_TOKEN } from '../../core/services/usage-resolver.js';
import { createRuntimePorts } from '../runtime/runtime-composition.js';

const RUN_ID_RANDOM_BYTES = 3;

export const nodeTimer: Timer = {
  async wait(milliseconds: number): Promise<void> {
    await delay(milliseconds);
  },
};

export const nodeHasher: Hasher = {
  sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  },
};

export function newRunId(now: Date): string {
  return `run-${now.toISOString().replace(/[:.]/g, '-')}-${randomBytes(RUN_ID_RANDOM_BYTES).toString('hex')}`;
}

export type BootEstimatorInput = { readonly projectRoot: string; readonly config: ContextBrakeConfig; readonly clock: Clock; readonly harness: HarnessId };

export class RuntimeBootTokenEstimator implements BootTokenEstimator {
  constructor(private readonly input: BootEstimatorInput) {}

  async estimate(): Promise<number> {
    const decision = await createRuntimePorts(this.input).readBoot();
    if (decision.kind === 'none') return 0;
    return Math.ceil(decision.text.length / CHARACTERS_PER_TOKEN);
  }
}

export class ResolvedExecutableLauncher implements SessionLauncher {
  readonly harness: HarnessId;
  readonly executableNames: readonly string[];

  constructor(private readonly launcher: SessionLauncher, private readonly executable: string) {
    this.harness = launcher.harness;
    this.executableNames = launcher.executableNames;
  }

  buildCommand(request: SessionRequest): SessionCommand {
    return { ...this.launcher.buildCommand(request), executable: this.executable };
  }

  parseLine(line: string): ReturnType<SessionLauncher['parseLine']> {
    return this.launcher.parseLine(line);
  }
}
