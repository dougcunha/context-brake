export default function plugin() {
  return {
    'tool.execute.before': async () => {
      throw new Error('benchmark handler failure');
    },
  };
}
