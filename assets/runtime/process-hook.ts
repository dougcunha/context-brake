import process from 'node:process';

export type HookResponse = Readonly<Record<string, unknown>> | null;
export type HookResponses = Readonly<Record<string, HookResponse>>;

export const NO_OUTPUT: HookResponse = null;

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data); });
    process.stdin.on('error', () => { resolve(''); });
  });
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function resolveEvent(argEvent: string | undefined, payload: Record<string, unknown>): string {
  if (argEvent) return argEvent;
  const raw = payload.hook_event_name ?? payload.event ?? payload.hookName ?? '';
  return typeof raw === 'string' ? raw : '';
}

function findResponse(responses: HookResponses, event: string): HookResponse {
  return Object.hasOwn(responses, event) ? (responses[event] ?? NO_OUTPUT) : NO_OUTPUT;
}

export async function runProcessHook(responses: HookResponses): Promise<void> {
  const payload = parsePayload(await readStdin());
  const response = findResponse(responses, resolveEvent(process.argv[2], payload));
  if (response !== NO_OUTPUT) process.stdout.write(JSON.stringify(response));
}
