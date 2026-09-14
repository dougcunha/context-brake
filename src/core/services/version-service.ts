import semver from 'semver';
import { z } from 'zod';
import type { VersionProbe, VersionSource, VersionStatus } from '../contracts/harness.js';
import type { ProcessResult } from '../contracts/processes.js';

const versionPattern = /\bv?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\b/;
const displaySchema = z.string();

export type VersionNormalizationInput = { readonly display: unknown; readonly source?: VersionSource; readonly minimumVersion?: string | null };
export type ProcessVersionInput = { readonly result: ProcessResult; readonly source?: VersionSource; readonly minimumVersion?: string | null };

function normalizedMinimum(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = semver.clean(value);
  if (normalized) return normalized;
  throw new Error(`Invalid minimum semantic version: ${value}`);
}

function versionStatus(version: string, minimumVersion: string | null): VersionStatus {
  if (minimumVersion && semver.lt(version, minimumVersion)) return 'old';
  return 'resolved';
}

export function normalizeVersion(input: VersionNormalizationInput): VersionProbe {
  const source = input.source ?? 'executable';
  const minimumVersion = normalizedMinimum(input.minimumVersion);
  if (input.display === null || input.display === undefined) return { status: 'unknown', display: null, normalized: null, source, minimumVersion };
  const parsed = displaySchema.safeParse(input.display);
  if (!parsed.success) return { status: 'malformed', display: null, normalized: null, source, minimumVersion };
  const match = versionPattern.exec(parsed.data);
  const normalized = match?.[1] ? semver.clean(match[1]) : null;
  if (!normalized) return { status: 'malformed', display: parsed.data, normalized: null, source, minimumVersion };
  return { status: versionStatus(normalized, minimumVersion), display: parsed.data, normalized, source, minimumVersion };
}

function processDisplay(result: ProcessResult): string | null {
  const output = result.stdout.trim() || result.stderr.trim();
  return output || null;
}

export function versionFromProcess(input: ProcessVersionInput): VersionProbe {
  const source = input.source ?? 'executable';
  const minimumVersion = normalizedMinimum(input.minimumVersion);
  const display = processDisplay(input.result);
  if (input.result.status === 'timed_out') return { status: 'timed_out', display, normalized: null, source, minimumVersion };
  if (input.result.status === 'failed') return { status: 'unknown', display, normalized: null, source, minimumVersion };
  return normalizeVersion({ display, source, minimumVersion });
}
