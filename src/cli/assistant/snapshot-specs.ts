import { SNAPSHOT_TRIGGER_ZONES } from '../../core/contracts/zones.js';
import type { PromptSpec } from './ui-prompt.js';

const NONE_WORD = 'none';

export function commandSpec(current: string | undefined): PromptSpec {
  const shown = current ?? NONE_WORD;
  return {
    line: `Snapshot skill name (Enter keeps [${shown}], type none for no skill): `,
    ui: { kind: 'text', message: 'Name of the skill the agent runs before a reset, without a leading slash (type none for no skill)', placeholder: `Enter keeps ${shown}` },
  };
}

export const PERCENTAGE_OPTION = 'percentage';

export type TriggerState = { readonly zone: string; readonly percentage: number | null };

export function triggerSpec(current: TriggerState): PromptSpec {
  const shown = current.percentage === null ? current.zone : `${current.percentage}%`;
  const options = [...SNAPSHOT_TRIGGER_ZONES.map((zone) => ({ value: zone, label: zone })), { value: PERCENTAGE_OPTION, label: 'Percentage of the context window' }];
  return {
    line: `Snapshot trigger ${SNAPSHOT_TRIGGER_ZONES.join(', ')} or a percentage 1-100 [${shown}]: `,
    ui: { kind: 'select', message: 'Where the snapshot is requested: a zone or a percentage of the context window', options, initial: current.percentage === null ? current.zone : PERCENTAGE_OPTION },
  };
}

export function percentageSpec(current: number | null): PromptSpec {
  const shown = current === null ? 'none' : `${current}%`;
  return {
    line: `Trigger percentage 1-100 [${shown}]: `,
    ui: { kind: 'text', message: 'Percentage of the context window that requests the snapshot (1-100)', placeholder: `Enter keeps ${shown}` },
  };
}

export function resumeSpec(current: string | undefined): PromptSpec {
  const shown = current ?? NONE_WORD;
  return {
    line: `Resume skill name (Enter keeps [${shown}]): `,
    ui: { kind: 'text', message: 'Name of the skill that resumes the work in the new session', placeholder: `Enter keeps ${shown}` },
  };
}
