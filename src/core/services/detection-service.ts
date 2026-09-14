import { HARNESS_IDS, SHARED_INSTRUCTION_EVIDENCE, type DetectionEvidence, type DetectionInput, type DetectionSelection, type DetectionSources, type DetectionState, type HarnessDetection, type HarnessId, type VersionProbe } from '../contracts/harness.js';

const EMPTY_INPUT: DetectionInput = { project: [] };

type DetectionDecision = {
  readonly included: boolean;
  readonly excluded: boolean;
  readonly hasProjectEvidence: boolean;
  readonly hasSignal: boolean;
};

function uniqueEvidence(evidence: readonly DetectionEvidence[]): DetectionEvidence[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.origin}|${item.kind}|${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return item.kind !== SHARED_INSTRUCTION_EVIDENCE;
  });
}

function versionFields(version: VersionProbe | undefined): Pick<HarnessDetection, 'version' | 'versionSource'> {
  if (!version?.normalized) return { version: null, versionSource: null };
  return { version: version.normalized, versionSource: version.source };
}

function detectionState(decision: DetectionDecision): DetectionState | null {
  if (decision.excluded) return 'excluded';
  if (decision.included || decision.hasProjectEvidence) return 'project';
  if (decision.hasSignal) return 'candidate';
  return null;
}

function detectionFor(harness: HarnessId, source: DetectionInput, selection: DetectionSelection): HarnessDetection | null {
  const included = selection.include?.includes(harness) ?? false;
  const excluded = selection.exclude?.includes(harness) ?? false;
  const evidence = uniqueEvidence([...source.project, ...(source.machine ?? [])]);
  const hasProjectEvidence = evidence.some((item) => item.origin === 'project');
  const hasSignal = evidence.length > 0 || source.version !== undefined;
  const state = detectionState({ included, excluded, hasProjectEvidence, hasSignal });
  if (!state) return null;
  return { harness, state, evidence, selectedExplicitly: included, ...versionFields(source.version) };
}

export class DetectionSelectionError extends Error {
  constructor(readonly harness: HarnessId) {
    super(`Harness ${harness} cannot be included and excluded at the same time.`);
  }
}

function assertSelection(selection: DetectionSelection): void {
  const included = new Set(selection.include ?? []);
  const conflict = (selection.exclude ?? []).find((harness) => included.has(harness));
  if (conflict) throw new DetectionSelectionError(conflict);
}

export function detectHarnesses(sources: Partial<DetectionSources>, selection: DetectionSelection = {}): HarnessDetection[] {
  assertSelection(selection);
  return HARNESS_IDS.map((harness) => detectionFor(harness, sources[harness] ?? EMPTY_INPUT, selection)).filter((detection): detection is HarnessDetection => detection !== null);
}
