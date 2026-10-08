import { z } from 'zod/mini';
import type { RestartReasonCode } from './auto-restart.js';
import type { HandoffReader } from './handoff.js';

export const guardStateSchema = z.strictObject({ consecutive: z.int().check(z.minimum(0)), toolCallsSinceSeed: z.nullable(z.int().check(z.minimum(0))) });
export type GuardState = z.infer<typeof guardStateSchema>;
export const IDLE_GUARD_STATE: GuardState = { consecutive: 0, toolCallsSinceSeed: null };

export type StandDownFacts = { readonly disabledByEnv: boolean; readonly interactive: boolean };

export interface RestartGuardStore {
  read(): Promise<GuardState>;
  write(state: GuardState): Promise<void>;
}

export type OpenSessionRequest = {
  readonly seed: string;
  onOpened(): Promise<void>;
  onRejected(): Promise<void>;
};

export interface RestartHost {
  readonly guards: RestartGuardStore;
  readonly handoff: HandoffReader;
  standDown(): Promise<StandDownFacts>;
  turnStartedAt(): number | undefined;
  resumeForSeed(): Promise<string | null>;
  openSession(request: OpenSessionRequest): void;
  log(code: RestartReasonCode): Promise<void>;
  notify(text: string): void;
}
