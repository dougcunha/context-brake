import { WORK_FILE, readCall, shellCall, writeCall, type OutputKind, type SimulatedCall } from './scenarios.js';

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
export function workStep(call: SimulatedCall): SessionStep {
  return step('work', call);
}
export function criticalCalls(): readonly SessionStep[] {
  return [
    step('critical', readCall('critical-read-code', 'src/app.ts')),
    step('critical', writeCall('critical-write-code', 'src/generated.ts', 'export const generated = true;\n')),
    step('critical', shellCall('critical-git-status', 'git status', ['status'])),
  ];
}
export function usageSteps(input: { readonly kind: OutputKind; readonly turns: number; readonly characters: number }): readonly SessionStep[] {
  return Array.from({ length: input.turns }, (_, index) => step('work', { id: `work-${index + 1}`, tool: 'read', path: 'src/app.ts', content: '', output: { kind: input.kind, characters: input.characters } }));
}
export function brakeWorkFlow(largeReadCharacters: number): readonly SessionStep[] {
  const largeRead = { kind: 'code', characters: largeReadCharacters } as const;
  return [...usageSteps({ ...largeRead, turns: 8 }), workStep(writeCall('work-write', WORK_FILE, 'export const feature = 1;\n')), workStep({ id: 'work-9', tool: 'read', path: 'src/app.ts', content: '', output: largeRead })];
}
