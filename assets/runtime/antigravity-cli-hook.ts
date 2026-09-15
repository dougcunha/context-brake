import { runProcessHook } from './process-hook.js';

const NO_INJECTED_STEPS = { injectSteps: [] };

void runProcessHook({
  PreInvocation: NO_INJECTED_STEPS,
});
