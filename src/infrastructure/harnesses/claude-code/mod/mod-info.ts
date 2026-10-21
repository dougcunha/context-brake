import { RESTART_LOG_RELATIVE_DIR } from '../../../../core/contracts/restart-log.js';

export const MOD_VERSION = '1.2.0';
export const MOD_LOG_DIR = `${RESTART_LOG_RELATIVE_DIR}/claude-code`;
export const CONFIG_FILE = 'context-brake.config.json';
export const PERSON_PROMPT_ORIGINS: readonly string[] = ['composer', 'bridge'];
export const SEED_SWITCH_POLL_MS = 100;
export const SEED_SWITCH_LIMIT_MS = 3_000;
export const HANDOFF_COMMAND_NAME = 'handoff';
export const HANDOFF_SUBMIT_DELAY_MS = 100;
