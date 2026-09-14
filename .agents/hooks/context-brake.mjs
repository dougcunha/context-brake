// assets/runtime/process-hook.ts
import process from "node:process";
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
function resolveEvent(argEvent, payload) {
  if (argEvent) return argEvent;
  const raw = payload.hook_event_name ?? payload.event ?? payload.hookName ?? "";
  return typeof raw === "string" ? raw : "";
}
function buildResponse(event) {
  const norm = event.toLowerCase();
  if (norm === "pretooluse") {
    return JSON.stringify({
      hookSpecificOutput: { permissionDecision: "allow" },
      permission: "allow",
      permissionDecision: "allow",
      decision: "allow"
    });
  }
  if (norm === "posttooluse") {
    return JSON.stringify({
      hookSpecificOutput: { additionalContext: "" },
      additional_context: "",
      additionalContext: ""
    });
  }
  if (norm === "preinvocation") {
    return JSON.stringify({ injectSteps: [] });
  }
  return JSON.stringify({});
}
async function runProcessHook() {
  try {
    const raw = await readStdin();
    let payload = {};
    if (raw.trim().length > 0) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = {};
      }
    }
    const event = resolveEvent(process.argv[2], payload);
    const response = buildResponse(event);
    process.stdout.write(response);
  } catch {
    process.stdout.write("{}");
  }
}
void runProcessHook();
export {
  runProcessHook
};
