export const ACCEPTANCE_MODE = 'acceptance';
const TEST_MODE_VARIABLE = 'CONTEXT_BRAKE_TEST_MODE';

export function isAcceptanceRun(): boolean {
  return process.env[TEST_MODE_VARIABLE] === ACCEPTANCE_MODE;
}

export function acceptanceIndexes(count: number, regressionIndexes: readonly number[]): readonly number[] {
  return isAcceptanceRun() ? Array.from({ length: count }, (_, index) => index) : regressionIndexes;
}

export function distinctScenarioIndexes(count: number, scenarioOf: (index: number) => string): readonly number[] {
  const all = Array.from({ length: count }, (_, index) => index);
  return acceptanceIndexes(count, all.filter((index) => all.findIndex((other) => scenarioOf(other) === scenarioOf(index)) === index));
}
