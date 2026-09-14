export type PiApi = {
  on?: (event: string, handler: (eventData: unknown, ctx: unknown) => Promise<unknown>) => void;
};

export default function contextBrakePiExtension(pi: PiApi): void {
  try {
    pi?.on?.('tool_call', async () => ({}));
    pi?.on?.('tool_result', async () => ({}));
    pi?.on?.('before_agent_start', async () => ({}));
  } catch {
    // Guard against host API differences
  }
}
