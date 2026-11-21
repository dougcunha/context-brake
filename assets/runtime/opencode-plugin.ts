import { createOpenCodePlugin, type OpenCodePluginHooks } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { setupOpenCodeV2Plugin, type OpenCodeV2PluginContext } from '../../src/infrastructure/harnesses/opencode/runtime-v2.js';

export default {
  id: 'context-brake',
  setup(ctx?: OpenCodeV2PluginContext): Promise<() => void> {
    return setupOpenCodeV2Plugin(ctx);
  },
  server(context?: unknown): OpenCodePluginHooks {
    return createOpenCodePlugin(context);
  },
};
