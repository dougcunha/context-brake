import type { SnapshotConfig } from '../../core/contracts/configuration.js';
import { mergeSnapshot, type SnapshotFlags } from '../../core/services/snapshot-merge.js';
import { askValidated } from './ask.js';
import { commandSpec, resumeSpec, triggerSpec } from './snapshot-specs.js';
import type { PromptPort } from './prompt-port.js';
import type { AssistantContext, Validation } from './types.js';

export type SnapshotChoice = { readonly command: string | null; readonly triggerZone: string; readonly resumeCommand: string | null; readonly flags: readonly string[] };

const NONE_WORD = 'none';
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
    const error = checked({ command: 'placeholder', resumeCommand: answer });
    return error === null ? { value: answer } : { error };
  };
}

function valueFlag(name: string, value: string): string[] {
  return value.startsWith('-') ? [`${name}=${value}`] : [name, value];
}

type CommandOptionsInput = { readonly current: SnapshotConfig | undefined; readonly command: string };

async function askCommandOptions(input: CommandOptionsInput, prompts: PromptPort): Promise<SnapshotChoice | null> {
  const { current, command } = input;
  const currentZone = current?.triggerZone ?? DEFAULT_ZONE;
  const zone = await askValidated(prompts, triggerSpec(currentZone), validateTrigger(currentZone));
  if (zone === null) return null;
  const resume = await askValidated(prompts, resumeSpec(current?.resumeCommand), validateResume(current?.resumeCommand));
  if (resume === null) return null;
  const flags = [
    ...(command === current?.command ? [] : valueFlag('--snapshot-command', command)),
    ...(zone.value === currentZone ? [] : ['--snapshot-trigger', zone.value]),
    ...(resume.value === null || resume.value === current?.resumeCommand ? [] : valueFlag('--resume-command', resume.value)),
  ];
  return { command, triggerZone: zone.value, resumeCommand: resume.value, flags };
}

export async function askSnapshot(context: AssistantContext, prompts: PromptPort): Promise<SnapshotChoice | null> {
  const current = context.config?.snapshot;
  const command = await askValidated(prompts, commandSpec(current?.command), validateCommand(current?.command));
  if (command === null) return null;
  if (command.value !== null) return askCommandOptions({ current, command: command.value }, prompts);
  const flags = current?.command === undefined ? [] : ['--no-snapshot-command'];
  return { command: null, triggerZone: current?.triggerZone ?? DEFAULT_ZONE, resumeCommand: null, flags };
}
