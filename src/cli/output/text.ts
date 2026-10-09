import type { CliErrorDocument, DiagnosticFinding, DoctorReport, InstallReport } from '../../core/contracts/diagnostics.js';
import { excludedDetectionLines } from './detection-text.js';
import { renderModeLines } from './doctor-mode-text.js';
import { renderActiveSessionsText } from './doctor-sessions-text.js';

export function renderFinding(f: DiagnosticFinding): string {
  const label = f.severity === 'error' ? '[ERROR]' : f.severity === 'warning' ? '[WARN]' : '[OK]';
  const lines = [`  ${label} ${f.code}: ${f.message}`];
  if (f.impact) lines.push(`    Impact: ${f.impact}`);
  if (f.remediation) lines.push(`    Remediation: ${f.remediation}`);
  return lines.join('\n');
}

export function renderInstallText(report: InstallReport): void {
  const stream = report.status === 'errors' ? process.stderr : process.stdout;
  const label = report.status === 'errors' ? '[ERROR]' : report.status === 'warnings' ? '[WARN]' : '[OK]';
  stream.write(`${label} ContextBrake ${report.command} (${report.mode})\n`);
  for (const h of report.plan.harnesses) {
    stream.write(`  - ${h.harness}: ${h.supportLevel} support (${h.outcome})\n`);
    for (const lim of h.limitations) stream.write(`    * ${lim.capability}: ${lim.impact}\n`);
  }
  for (const line of excludedDetectionLines(report.detections)) stream.write(line);
  if (report.plan.changes.length > 0) {
    stream.write('  Planned changes:\n');
    for (const c of report.plan.changes) {
      stream.write(`    [${c.kind}] ${c.path} (${c.owner})\n`);
      if (report.command === 'init' && (c.owner === 'config' || c.owner === 'gitignore')) stream.write(`      ${c.preview.summary}\n`);
    }
  }
  if (report.plan.conflicts.length > 0) {
    stream.write('  Conflicts:\n');
    for (const c of report.plan.conflicts) stream.write(`    [ERROR] ${c.path}: ${c.detail}\n`);
  }
  for (const f of report.findings) stream.write(`${renderFinding(f)}\n`);
}

export function renderDoctorText(report: DoctorReport): void {
  const stream = report.status === 'errors' ? process.stderr : process.stdout;
  const label = report.status === 'errors' ? '[ERROR]' : report.status === 'warnings' ? '[WARN]' : '[OK]';
  stream.write(`${label} ContextBrake doctor: ${report.status}\n`);
  for (const integ of report.integrations) {
    let line = `  - ${integ.harness}: ${integ.state} (support: ${integ.support.supportLevel}`;
    if (integ.version) line += `, version: ${integ.version}`;
    if (integ.overhead?.p95Milliseconds !== null && integ.overhead?.p95Milliseconds !== undefined) {
      line += `, overhead: ${integ.overhead.p95Milliseconds}ms/${integ.overhead.targetMilliseconds}ms (${integ.overhead.status})`;
    }
    line += ')';
    stream.write(`${line}\n`);
    for (const lim of integ.support.limitations) stream.write(`    * ${lim.capability}: ${lim.impact}\n`);
  }
  for (const line of excludedDetectionLines(report.detections)) stream.write(line);
  const window = report.contextWindow;
  if (window) stream.write(`  - context window: ${window.source} (bridge: ${window.bridge}, last window: ${window.lastWindowTokens ?? 'unknown'})\n`);
  stream.write(renderModeLines(report));
  stream.write(renderActiveSessionsText(report.activeSessions, new Date()));
  for (const f of report.findings) stream.write(`${renderFinding(f)}\n`);
}

export function renderCliErrorText(doc: CliErrorDocument): void {
  process.stderr.write(`[ERROR] ${doc.error.code}: ${doc.error.message}\n`);
}

