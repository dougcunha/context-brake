import { MOD_VERSION } from './mod/mod-info.js';

export const MOD_MARKETPLACE_NAME = 'context-brake-local';
export const MOD_PLUGIN_NAME = 'context-brake-restart';
export const MOD_PLUGIN_ID = `${MOD_PLUGIN_NAME}@${MOD_MARKETPLACE_NAME}`;
export const MOD_ROOT = '.context-brake/claude-mod';
export const MOD_MARKETPLACE_FILE = `${MOD_ROOT}/.claude-plugin/marketplace.json`;
export const MOD_MANIFEST_FILE = `${MOD_ROOT}/${MOD_PLUGIN_NAME}/.claude-plugin/plugin.json`;
export const MOD_HOOKS_FILE = `${MOD_ROOT}/${MOD_PLUGIN_NAME}/hooks/hooks.json`;
export const MOD_MODULE_FILE = `${MOD_ROOT}/${MOD_PLUGIN_NAME}/hooks/register.mjs`;
export const MOD_FILES: readonly string[] = [MOD_MARKETPLACE_FILE, MOD_MANIFEST_FILE, MOD_HOOKS_FILE, MOD_MODULE_FILE];

const DESCRIPTION = 'Restarts the Claude Code session when ContextBrake asks for a reset.';
const AUTHOR = { name: 'ContextBrake' };

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function marketplaceText(): string {
  return json({ name: MOD_MARKETPLACE_NAME, owner: AUTHOR, description: DESCRIPTION, plugins: [{ name: MOD_PLUGIN_NAME, description: DESCRIPTION, source: `./${MOD_PLUGIN_NAME}` }] });
}

export function pluginManifestText(): string {
  return json({ name: MOD_PLUGIN_NAME, version: MOD_VERSION, description: DESCRIPTION, author: AUTHOR });
}

export function hooksManifestText(): string {
  return json({ modules: ['./register.mjs'] });
}
