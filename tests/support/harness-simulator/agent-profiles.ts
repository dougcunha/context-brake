import { CHECKPOINT_FILE, PLAN_FILE, VALIDATION_COMMAND, WORK_FILE, checkpointContent, nodeCall, planContent, readCall, shellCall, writeCall, type OutputKind, type SimulatedCall } from './scenarios.js';

export type AgentProfile = 'compliant' | 'ignores_yellow' | 'ignores_red' | 'shell_operator' | 'out_of_allowlist_write' | 'parallel_batch' | 'compaction' | 'failure_above_ceiling' | 'subagent';
export const PROFILE_CATALOG: readonly AgentProfile[] = [
  'compliant', 'compliant', 'compliant', 'ignores_yellow', 'ignores_yellow', 'ignores_yellow', 'ignores_red', 'ignores_red', 'ignores_red', 'shell_operator',
  'shell_operator', 'shell_operator', 'out_of_allowlist_write', 'out_of_allowlist_write', 'parallel_batch', 'parallel_batch', 'compaction', 'compaction', 'failure_above_ceiling', 'subagent',
];
export type CallExpectation = 'execute' | 'deny' | 'harness_gated' | 'failure_deny';
export type SessionStep = {
  readonly phase: 'work' | 'save' | 'critical' | 'resilience';
  readonly expectation: CallExpectation;
  readonly call: SimulatedCall;
  readonly parallel?: boolean | undefined;
  readonly agentId?: string | undefined;
  readonly corruptConfigFirst?: boolean | undefined;
  readonly resetAfter?: 'compact' | undefined;
  readonly skipPost?: boolean | undefined;
};
function step(phase: SessionStep['phase'], expectation: CallExpectation, call: SimulatedCall): SessionStep {
  return { phase, expectation, call };
}
export function saveSequence(): readonly SessionStep[] {
  const steps: SessionStep[] = [
    step('save', 'execute', readCall('save-read-plan', PLAN_FILE)),
    step('save', 'execute', readCall('save-read-checkpoint', CHECKPOINT_FILE)),
    step('save', 'execute', writeCall('save-write-plan', PLAN_FILE, planContent())),
    step('save', 'execute', writeCall('save-write-checkpoint', CHECKPOINT_FILE, checkpointContent())),
    step('save', 'execute', nodeCall('save-validation', VALIDATION_COMMAND)),
    step('save', 'execute', shellCall('save-git-status', 'git status', ['status'])),
    step('save', 'execute', shellCall('save-git-add', `git add ${WORK_FILE}`, ['add', WORK_FILE])),
    step('save', 'execute', shellCall('save-git-commit', 'git commit -m "checkpoint: step 1"', ['commit', '-m', 'checkpoint: step 1'])),
  ];
  return steps.map((entry) => (entry.call.id === 'save-git-commit' ? entry : { ...entry, skipPost: true }));
}
function forbiddenWrite(id: string, path: string): SessionStep {
  return step('critical', 'deny', writeCall(id, path, 'export const generated = true;\n'));
}
function operatorSteps(): readonly SessionStep[] {
  return [step('critical', 'deny', shellCall('critical-operator', 'git status && rm -rf src', ['status'])), step('critical', 'deny', shellCall('critical-push', 'git push', ['push']))];
}
function allowedStatus(): SessionStep { return step('critical', 'execute', shellCall('critical-git-status', 'git status', ['status'])); }
function gatedSave(): SessionStep { return step('critical', 'harness_gated', writeCall('critical-write-checkpoint', CHECKPOINT_FILE, checkpointContent())); }
function criticalSequence(): readonly SessionStep[] {
  return [forbiddenWrite('critical-write-code', 'src/generated.ts'), ...operatorSteps(), allowedStatus(), gatedSave()];
}
function failureSequence(): readonly SessionStep[] {
  return [
    { ...forbiddenWrite('failure-write-code', 'src/generated.ts'), corruptConfigFirst: true, expectation: 'failure_deny' },
    step('critical', 'execute', shellCall('failure-git-status', 'git status', ['status'])),
    step('critical', 'harness_gated', writeCall('failure-write-checkpoint', CHECKPOINT_FILE, checkpointContent())),
  ];
}
function parallelSequence(): readonly SessionStep[] {
  return [0, 1, 2].map((index) => ({ ...forbiddenWrite(`critical-parallel-${index}`, `src/generated-${index}.ts`), parallel: true }));
}
function compactStep(): SessionStep {
  return { ...step('resilience', 'execute', shellCall('resilience-status', 'git status', ['status'])), resetAfter: 'compact' };
}
function subagentStep(): SessionStep {
  return { ...step('resilience', 'execute', readCall('subagent-read', 'src/app.ts')), agentId: 'sub-1' };
}
const PROFILE_STEPS: Record<AgentProfile, () => readonly SessionStep[]> = {
  compliant: () => [...saveSequence(), allowedStatus()],
  ignores_yellow: () => [...saveSequence(), forbiddenWrite('critical-write-code', 'src/generated.ts'), allowedStatus()],
  ignores_red: () => [...saveSequence(), ...criticalSequence()],
  shell_operator: () => [...saveSequence(), ...operatorSteps(), allowedStatus()],
  out_of_allowlist_write: () => [...saveSequence(), forbiddenWrite('critical-write-code', 'src/generated.ts'), allowedStatus()],
  parallel_batch: () => [...saveSequence(), ...parallelSequence()],
  compaction: () => [...saveSequence(), ...criticalSequence(), compactStep()],
  failure_above_ceiling: () => [...saveSequence(), ...failureSequence()],
  subagent: () => [...saveSequence(), subagentStep()],
};
export function workStep(call: SimulatedCall): SessionStep {
  return step('work', 'execute', call);
}
export function brakeWorkFlow(): readonly SessionStep[] {
  return [...usageSteps({ kind: 'code', turns: 11, characters: 700 }), workStep(writeCall('work-write', WORK_FILE, 'export const feature = 1;\n')), workStep(readCall('work-12', 'src/app.ts'))];
}
export function deniedRead(id: string, path: string): SessionStep { return step('critical', 'deny', readCall(id, path)); }
export function operatorTrap(id: string): SessionStep { return step('critical', 'deny', shellCall(id, 'git status && rm -rf src', ['status'])); }
export function bootAdherenceSteps(): readonly SessionStep[] {
  return [step('work', 'execute', nodeCall('boot-val', VALIDATION_COMMAND)), step('work', 'execute', readCall('boot-plan', PLAN_FILE)), step('work', 'execute', writeCall('boot-work', WORK_FILE, 'export const feature = 1;\n'))];
}
export function sessionSteps(profile: AgentProfile): readonly SessionStep[] {
  return [{ ...workStep(writeCall('work-write', WORK_FILE, 'export const feature = 1;\n')), skipPost: true }, ...PROFILE_STEPS[profile]()];
}
export function usageSteps(input: { readonly kind: OutputKind; readonly turns: number; readonly characters: number }): readonly SessionStep[] {
  return Array.from({ length: input.turns }, (_, index) => step('work', 'execute', { id: `work-${index + 1}`, tool: 'read', path: 'src/app.ts', content: '', output: { kind: input.kind, characters: input.characters } }));
}
export function stateToolHarness(harness: string): boolean {
  return harness !== 'cursor' && harness !== 'codex-cli';
}

