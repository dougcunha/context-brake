import { createOpenCodePlugin, type OpenCodePluginHooks } from '../../src/infrastructure/harnesses/opencode/runtime.js';

export default function contextBrakePlugin(context?: unknown): OpenCodePluginHooks {
  return createOpenCodePlugin(context);
}
