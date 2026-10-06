import { getNodeValue } from 'jsonc-parser';
import { removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';
import { parseAndValidateJson } from '../../storage/json-validator.js';
import { MOD_MARKETPLACE_NAME, MOD_PLUGIN_ID } from './auto-restart-files.js';

const MARKETPLACES_KEY = 'extraKnownMarketplaces';
const PLUGINS_KEY = 'enabledPlugins';

type SettingsShape = { readonly extraKnownMarketplaces?: Record<string, unknown>; readonly enabledPlugins?: Record<string, unknown> };

function parse(text: string): SettingsShape {
  return getNodeValue(parseAndValidateJson(text)) as SettingsShape;
}

export function hasModKeys(text: string): boolean {
  const settings = parse(text);
  return settings.extraKnownMarketplaces?.[MOD_MARKETPLACE_NAME] !== undefined || settings.enabledPlugins?.[MOD_PLUGIN_ID] !== undefined;
}

export function withModKeys(text: string, marketplacePath: string): string {
  const source = { source: { source: 'directory', path: marketplacePath } };
  const withMarketplace = setJsonProperty(text, [MARKETPLACES_KEY, MOD_MARKETPLACE_NAME], source);
  return setJsonProperty(withMarketplace, [PLUGINS_KEY, MOD_PLUGIN_ID], true);
}

function pruneEmpty(text: string, key: string, group: Record<string, unknown> | undefined): string {
  return group !== undefined && Object.keys(group).length === 0 ? removeJsonProperty(text, [key]) : text;
}

export function withoutModKeys(text: string): string {
  const removed = removeJsonProperty(removeJsonProperty(text, [MARKETPLACES_KEY, MOD_MARKETPLACE_NAME]), [PLUGINS_KEY, MOD_PLUGIN_ID]);
  const settings = parse(removed);
  return pruneEmpty(pruneEmpty(removed, MARKETPLACES_KEY, settings.extraKnownMarketplaces), PLUGINS_KEY, settings.enabledPlugins);
}

export function isEmptySettings(text: string): boolean {
  return text.replace(/\s/g, '') === '{}';
}
