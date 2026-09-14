export type OpenCodePluginHooks = {
  readonly 'tool.execute.before'?: (input: unknown) => Promise<void>;
  readonly 'tool.execute.after'?: (input: unknown) => Promise<void>;
};

export default function contextBrakePlugin(): OpenCodePluginHooks {
  return {
    'tool.execute.before': async () => {},
    'tool.execute.after': async () => {},
  };
}
