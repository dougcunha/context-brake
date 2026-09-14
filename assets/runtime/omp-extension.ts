export type OmpApi = {
  on?: (event: string, handler: (eventData: unknown, ctx: unknown) => Promise<unknown>) => void;
};

export default function contextBrakeOmpExtension(omp: OmpApi): void {
  try {
    omp?.on?.('tool_call', async () => ({}));
    omp?.on?.('tool_result', async () => ({}));
    omp?.on?.('before_agent_start', async () => ({}));
  } catch {
    // Guard against host API differences
  }
}
