// assets/runtime/process-hook.ts
import process from "node:process";
var NO_OUTPUT = null;
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", () => {
      resolve("");
    });
  });
}
function parsePayload(raw) {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function resolveEvent(argEvent, payload) {
  if (argEvent) return argEvent;
  const raw = payload.hook_event_name ?? payload.event ?? payload.hookName ?? "";
  return typeof raw === "string" ? raw : "";
}
function findResponse(responses, event) {
  return Object.hasOwn(responses, event) ? responses[event] ?? NO_OUTPUT : NO_OUTPUT;
}
async function runProcessHook(responses) {
  const payload = parsePayload(await readStdin());
  const response = findResponse(responses, resolveEvent(process.argv[2], payload));
  if (response !== NO_OUTPUT) process.stdout.write(JSON.stringify(response));
}

// assets/runtime/claude-code-hook.ts
void runProcessHook({
  PreToolUse: NO_OUTPUT,
  PostToolUse: NO_OUTPUT,
  SessionStart: NO_OUTPUT
});
