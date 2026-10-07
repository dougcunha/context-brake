import type { ContextBrakeConfig } from '../../../../core/contracts/configuration.js';
import { configurationSchema } from '../../../../core/contracts/configuration.js';
import type { ModHost } from './host.js';
import { CONFIG_FILE } from './mod-info.js';

export type ModConfig = {
  readonly root: string;
  readonly maxConsecutive: number;
};

async function readConfigText($: ModHost, root: string): Promise<string | undefined> {
  const path = `${root}/${CONFIG_FILE}`;
  if (!(await $.fs.exists(path))) return undefined;
  const text = await $.fs.read(path);
  return typeof text === 'string' ? text : undefined;
}

function parseConfig(text: string): ContextBrakeConfig | undefined {
  try {
    const result = configurationSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export async function readModConfig($: ModHost): Promise<ModConfig | undefined> {
  const root = await $.session.root();
  const text = await readConfigText($, root);
  const config = text === undefined ? undefined : parseConfig(text);
  if (config?.autoRestart === undefined) return undefined;
  return {
    root,
    maxConsecutive: config.autoRestart.maxConsecutiveRestarts,
  };
}
