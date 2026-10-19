import type { DoctorReport, SnapshotReport } from '../../core/contracts/diagnostics.js';
import { describeTrigger } from '../../core/services/trigger-text.js';

type Invocation = NonNullable<SnapshotReport['invocations']>[number];

function renderInvocationLine(invocation: Invocation): string {
  const resume = invocation.resumeCommand === null ? '' : `, resume: ${invocation.resumeCommand}`;
  return `    - ${invocation.harness}: ${invocation.command}${resume}\n`;
}
function renderSnapshotLine(snapshot: SnapshotReport | undefined): string {
  if (snapshot === undefined) return '';
  if (snapshot.command === null) return `  - snapshot: not configured (zone headers only, trigger: ${describeTrigger(snapshot)})\n`;
  const resume = snapshot.resumeCommand === null ? '' : `, resume: ${snapshot.resumeCommand}`;
  const forms = (snapshot.invocations ?? []).map(renderInvocationLine).join('');
  return `  - snapshot: ${snapshot.command} at ${describeTrigger(snapshot)}${resume}\n${forms}`;
}
export function renderModeLines(report: Pick<DoctorReport, 'snapshot' | 'debugMode'>): string {
  const debug = report.debugMode === true ? '  - debug mode: on\n' : '';
  return `${renderSnapshotLine(report.snapshot)}${debug}`;
}
