import type { OutputKind, SimulatedCall } from './scenarios.js';

export type CallExpectation = 'execute';
export type SessionStep = {
  readonly phase: 'work' | 'critical';
  readonly expectation: CallExpectation;
  readonly call: SimulatedCall;
  readonly parallel?: boolean | undefined;
  readonly agentId?: string | undefined;
  readonly corruptConfigFirst?: boolean | undefined;
  readonly resetAfter?: 'compact' | undefined;
  readonly skipPost?: boolean | undefined;
};
function step(phase: SessionStep['phase'], call: SimulatedCall): SessionStep {
  return { phase, expectation: 'execute', call };
}
export function usageSteps(input: { readonly kind: OutputKind; readonly turns: number; readonly characters: number }): readonly SessionStep[] {
  return Array.from({ length: input.turns }, (_, index) => step('work', { id: `work-${index + 1}`, tool: 'read', path: 'src/app.ts', content: '', output: { kind: input.kind, characters: input.characters } }));
}
