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

export function triggerSpec(currentZone: string): PromptSpec {
  return {
    line: `Snapshot trigger ${SNAPSHOT_TRIGGER_ZONES.join(' or ')} [${currentZone}]: `,
    ui: { kind: 'select', message: 'Zone where the snapshot is requested', options: SNAPSHOT_TRIGGER_ZONES.map((zone) => ({ value: zone, label: zone })), initial: currentZone },
  };
}

export function resumeSpec(current: string | undefined): PromptSpec {
  const shown = current ?? NONE_WORD;
  return {
    line: `Resume skill name (Enter keeps [${shown}]): `,
    ui: { kind: 'text', message: 'Name of the skill that resumes the work in the new session', placeholder: `Enter keeps ${shown}` },
  };
}
