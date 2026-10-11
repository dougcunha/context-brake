import { join } from 'node:path';
import { getUserHome } from '../common/path-helpers.js';
import { CLAUDE_SETTINGS_FILE } from './statusline-settings.js';

export const CLAUDE_CONFIG_DIR_VARIABLE = 'CLAUDE_CONFIG_DIR';
const USER_SETTINGS_FILE_NAME = 'settings.json';

export function claudeUserSettingsPath(injectedUserHome?: string): string {
  const configDirectory = process.env[CLAUDE_CONFIG_DIR_VARIABLE]?.trim();
  if (injectedUserHome === undefined && configDirectory !== undefined && configDirectory !== '') return join(configDirectory, USER_SETTINGS_FILE_NAME);
  return join(getUserHome(injectedUserHome), CLAUDE_SETTINGS_FILE);
}
