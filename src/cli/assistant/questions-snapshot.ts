import type { SnapshotConfig } from '../../core/contracts/configuration.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { SkillCandidate } from '../../core/services/skill-candidates.js';
import { mergeSnapshot, type SnapshotFlags } from '../../core/services/snapshot-merge.js';
import { askValidated } from './ask.js';
import { askSkill, loadCandidates } from './questions-skill.js';
import { commandSpec, resumeSpec, triggerSpec } from './snapshot-specs.js';
import type { PromptPort } from './prompt-port.js';
import type { AssistantContext, Validation } from './types.js';

export type SnapshotChoice = { readonly command: string | null; readonly triggerZone: string; readonly resumeCommand: string | null; readonly flags: readonly string[] };

const NONE_WORD = 'none';
const RESUME_NONE_MESSAGE = 'Enter keeps the current resume skill; to remove it use --no-snapshot-command, which clears both skills.';
const DEFAULT_ZONE = 'RED';

function checked(candidate: Partial<SnapshotFlags>): string | null {
  const merge = mergeSnapshot(undefined, { ...candidate, clearCommand: false });
  return 'error' in merge ? merge.error : null;
}

function validateCommand(current: string | undefined): (answer: string) => Validation<string | null> {
  return (answer) => {
    if (answer === '') return { value: current ?? null };
    if (answer.toLowerCase() === NONE_WORD) return { value: null };
    const error = checked({ command: answer });
    return error === null ? { value: answer } : { error };
  };
}

function validateTrigger(current: string): (answer: string) => Validation<string> {
  return (answer) => {
    if (answer === '') return { value: current };
    const error = checked({ triggerZone: answer });
    return error === null ? { value: answer } : { error };
  };
}

function validateResume(current: string | undefined): (answer: string) => Validation<string | null> {
  return (answer) => {
    if (answer === '') return { value: current ?? null };
    if (answer.toLowerCase() === NONE_WORD) return { error: RESUME_NONE_MESSAGE };
    const error = checked({ command: 'placeholder', resumeCommand: answer });
    return error === null ? { value: answer } : { error };
  };
}

type SkillPool = { readonly candidates: readonly SkillCandidate[]; readonly selectedCount: number };
type CommandOptionsInput = { readonly current: SnapshotConfig | undefined; readonly command: string; readonly pool: SkillPool };

async function askCommandOptions(input: CommandOptionsInput, prompts: PromptPort): Promise<SnapshotChoice | null> {
  const { current, command, pool } = input;
  const currentZone = current?.triggerZone ?? DEFAULT_ZONE;
  const zone = await askValidated(prompts, triggerSpec(currentZone), validateTrigger(currentZone));
  if (zone === null) return null;
  const typed = { spec: resumeSpec(current?.resumeCommand), validate: validateResume(current?.resumeCommand) };
  const resume = await askSkill({ role: 'resume', current: current?.resumeCommand, exclude: command, ...pool, typed }, prompts);
  if (resume === null) return null;
  const flags = [
    ...(command === current?.command ? [] : ['--snapshot-command', command]),
    ...(zone.value === currentZone ? [] : ['--snapshot-trigger', zone.value]),
    ...(resume.value === null || resume.value === current?.resumeCommand ? [] : ['--resume-command', resume.value]),
  ];
  return { command, triggerZone: zone.value, resumeCommand: resume.value, flags };
}

export async function askSnapshot(context: AssistantContext, selected: readonly HarnessId[], prompts: PromptPort): Promise<SnapshotChoice | null> {
  const current = context.config?.snapshot;
  const pool = { candidates: await loadCandidates(context, selected), selectedCount: selected.length };
  const typed = { spec: commandSpec(current?.command), validate: validateCommand(current?.command) };
  const command = await askSkill({ role: 'snapshot', current: current?.command, ...pool, typed }, prompts);
  if (command === null) return null;
  if (command.value !== null) return askCommandOptions({ current, command: command.value, pool }, prompts);
  const flags = current?.command === undefined ? [] : ['--no-snapshot-command'];
  return { command: null, triggerZone: current?.triggerZone ?? DEFAULT_ZONE, resumeCommand: null, flags };
}
