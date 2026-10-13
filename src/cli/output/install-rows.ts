import type { DiagnosticFinding, InstallReport } from '../../core/contracts/diagnostics.js';
import type { CardRow } from './card.js';
import type { Tone } from './style.js';

type PlannedChange = InstallReport['plan']['changes'][number];

const CHANGE_TONES: Record<PlannedChange['kind'], Tone> = { create: 'good', update: 'accent', delete: 'plain' };
const SEVERITY_LABELS: Record<DiagnosticFinding['severity'], { readonly label: string; readonly tone: Tone }> = {
  ok: { label: '[OK]', tone: 'good' },
  warning: { label: '[WARN]', tone: 'warn' },
  error: { label: '[ERROR]', tone: 'bad' },
};

export function harnessRows(report: InstallReport): CardRow[] {
  const planned = report.plan.harnesses.map((h): CardRow => ({
    label: h.harness, value: `${h.supportLevel} support (${h.outcome})`, tone: h.outcome === 'conflict' ? 'bad' : 'good',
    notes: h.limitations.map((limitation) => `${limitation.capability}: ${limitation.impact}`),
  }));
  const excluded = report.detections.filter((detection) => detection.state === 'excluded');
  return [...planned, ...excluded.map((detection): CardRow => ({ label: detection.harness, value: 'excluded by configuration', tone: 'muted' }))];
}

export function changeRows(report: InstallReport): CardRow[] {
  const showSummary = report.command === 'init';
  return report.plan.changes.map((change): CardRow => ({
    label: change.kind, value: `${change.path} (${change.owner})`, tone: CHANGE_TONES[change.kind],
    notes: showSummary && (change.owner === 'config' || change.owner === 'gitignore') ? [change.preview.summary] : [],
  }));
}

export function conflictRows(report: InstallReport): CardRow[] {
  return report.plan.conflicts.map((conflict): CardRow => ({ label: SEVERITY_LABELS.error.label, value: `${conflict.path}: ${conflict.detail}`, tone: 'bad' }));
}

export function findingRows(report: InstallReport): CardRow[] {
  return report.findings.map((finding): CardRow => {
    const { label, tone } = SEVERITY_LABELS[finding.severity];
    const notes = [finding.impact ? `Impact: ${finding.impact}` : '', finding.remediation ? `Remediation: ${finding.remediation}` : ''];
    return { label, value: `${finding.code}: ${finding.message}`, tone, notes: notes.filter((note) => note !== '') };
  });
}
