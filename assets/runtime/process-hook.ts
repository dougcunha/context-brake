import process from 'node:process';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data); });
    process.stdin.on('error', () => { resolve(''); });
  });
}

function resolveEvent(argEvent: string | undefined, payload: Record<string, unknown>): string {
  if (argEvent) return argEvent;
  const raw = payload.hook_event_name ?? payload.event ?? payload.hookName ?? '';
  return typeof raw === 'string' ? raw : '';
}

function buildResponse(event: string): string {
  const norm = event.toLowerCase();
  if (norm === 'pretooluse') {
    return JSON.stringify({
      hookSpecificOutput: { permissionDecision: 'allow' },
      permission: 'allow',
      permissionDecision: 'allow',
      decision: 'allow',
    });
  }
  if (norm === 'posttooluse') {
    return JSON.stringify({
      hookSpecificOutput: { additionalContext: '' },
      additional_context: '',
      additionalContext: '',
    });
  }
  if (norm === 'preinvocation') {
    return JSON.stringify({ injectSteps: [] });
  }
  return JSON.stringify({});
}

export async function runProcessHook(): Promise<void> {
  try {
    const raw = await readStdin();
    let payload: Record<string, unknown> = {};
    if (raw.trim().length > 0) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        payload = {};
      }
    }
    const event = resolveEvent(process.argv[2], payload);
    const response = buildResponse(event);
    process.stdout.write(response);
  } catch {
    process.stdout.write('{}');
  }
}

void runProcessHook();

