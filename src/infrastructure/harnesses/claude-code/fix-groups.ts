import type { FixGroupMap } from '../../../core/contracts/fix.js';

export const CLAUDE_FIX_GROUPS: FixGroupMap = {
  STATUSLINE_BRIDGE_OUTDATED: 'automatic',
  STATUSLINE_BRIDGE_MISSING_SCRIPT: 'automatic',
  STATUSLINE_STATE_INVALID: 'automatic',
  STATUSLINE_PREVIOUS_CHANGED: 'automatic',
  STATUSLINE_BRIDGE_ABSENT: 'automatic',
  AUTO_RESTART_OUTDATED_MOD: 'automatic',
  STATUSLINE_BRIDGE_INACTIVE: 'decision',
};
