export default function plugin() {
  return {
    'tool.execute.after': async () => {
      throw new Error('benchmark handler failure');
    },
  };
}
