import type { OverheadMeasurement, OverheadMeasurer } from '../../src/core/contracts/diagnostics.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';

const IN_PROCESS_HARNESSES: ReadonlySet<HarnessId> = new Set(['opencode', 'pi', 'oh-my-pi']);
const PROCESS_TARGET_MILLISECONDS = 100;
const IN_PROCESS_TARGET_MILLISECONDS = 15;
export const FAKE_P95_MILLISECONDS = 1;
export const FAKE_SAMPLE_COUNT = 1;

export const fakeOverheadMeasurer: OverheadMeasurer = {
  measure(harness: HarnessId): Promise<OverheadMeasurement> {
    const inProcess = IN_PROCESS_HARNESSES.has(harness);
    return Promise.resolve({
      harness,
      executionModel: inProcess ? 'in_process' : 'process',
      sampleCount: FAKE_SAMPLE_COUNT,
      p95Milliseconds: FAKE_P95_MILLISECONDS,
      targetMilliseconds: inProcess ? IN_PROCESS_TARGET_MILLISECONDS : PROCESS_TARGET_MILLISECONDS,
      status: 'pass',
    });
  },
};
