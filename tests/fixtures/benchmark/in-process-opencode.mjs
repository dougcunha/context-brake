export const counters = { before: 0, badArgs: 0 };

export default function plugin() {
  return {
    'tool.execute.before': async (input, output) => {
      counters.before += 1;
      const valid = Boolean(input) && input.tool === 'bash' && output?.args?.command === 'ls';
      if (!valid) counters.badArgs += 1;
    },
  };
}
