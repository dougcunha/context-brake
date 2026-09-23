import type { CliErrorDocument, DiagnosticFinding, DoctorReport, InstallReport, PlanStatusReport } from '../../core/contracts/diagnostics.js';
import type { PlanInitResult } from '../commands/plan.js';

export function renderFinding(f: DiagnosticFinding): string {
  const label = f.severity === 'error' ? '[ERROR]' : f.severity === 'warning' ? '[WARN]' : '[OK]';
  const lines = [`  ${label} ${f.code}: ${f.message}`];
  if (f.impact) lines.push(`    Impact: ${f.impact}`);
  if (f.remediation) lines.push(`    Remediation: ${f.remediation}`);
  return lines.join('\n');
}

export function findingPrintKey(code: string, path: string | null): string {
  return `${code}|${path ?? ''}`;
}

export function renderInstallText(report: InstallReport, alreadyPrinted?: ReadonlySet<string>): void {
  const stream = report.status === 'errors' ? process.stderr : process.stdout;
  const label = report.status === 'errors' ? '[ERROR]' : report.status === 'warnings' ? '[WARN]' : '[OK]';
  stream.write(`${label} ContextBrake ${report.command} (${report.mode})\n`);
  for (const h of report.plan.harnesses) {
    stream.write(`  - ${h.harness}: ${h.supportLevel} support (${h.outcome})\n`);
    for (const lim of h.limitations) stream.write(`    * ${lim.capability}: ${lim.impact}\n`);
  }
  if (report.plan.changes.length > 0) {
    stream.write('  Planned changes:\n');
    for (const c of report.plan.changes) stream.write(`    [${c.kind}] ${c.path} (${c.owner})\n`);
  }
  if (report.plan.conflicts.length > 0) {
    stream.write('  Conflicts:\n');
    for (const c of report.plan.conflicts) stream.write(`    [ERROR] ${c.path}: ${c.detail}\n`);
  }
  for (const f of report.findings) {
    if (alreadyPrinted?.has(findingPrintKey(f.code, f.path))) continue;
    stream.write(`${renderFinding(f)}\n`);
  }
  if (report.command === 'init' && report.status === 'success' && report.mode === 'applied' && report.plan.changes.length > 0) {
    stream.write('\nNext step: run context-brake plan init to create task plan.\n');
  }
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
  for (const f of report.findings) stream.write(`${renderFinding(f)}\n`);
}

export function renderCliErrorText(doc: CliErrorDocument): void {
  process.stderr.write(`[ERROR] ${doc.error.code}: ${doc.error.message}\n`);
}

export function renderPlanInitText(result: PlanInitResult): void {
  process.stdout.write(`[OK] ContextBrake plan init: ${result.taskId}\n`);
  for (const path of result.created) process.stdout.write(`  [create] ${path}\n`);
  process.stdout.write('\nNext step: edit the plan steps and their validation commands, then run context-brake plan status.\n');
}

export function renderPlanStatusText(report: PlanStatusReport): void {
  const stream = report.status === 'errors' ? process.stderr : process.stdout;
  if (!report.plan) {
    if (!report.files.plan.exists) {
      stream.write(`[OK] No plan exists at ${report.files.plan.path}. Run 'context-brake plan init --task="<name>"' to create one.\n`);
    }
    for (const f of report.findings) stream.write(`${renderFinding(f)}\n`);
    return;
  }
  const label = report.status === 'errors' ? '[ERROR]' : report.status === 'warnings' ? '[WARN]' : '[OK]';
  stream.write(`${label} Task: ${report.plan.title} (${report.plan.taskId})\n`);
  stream.write(`  Files: ${report.files.plan.path} [${report.files.plan.valid ? 'VALID' : 'INVALID'}], ${report.files.checkpoint.path} [${report.files.checkpoint.valid ? 'VALID' : 'INVALID'}]\n`);
  stream.write('  Steps:\n');
  for (const s of report.plan.steps) {
    const active = s.id === report.plan.activeStep?.id ? ' (active)' : '';
    stream.write(`    [${s.status}] ${s.id}: ${s.title}${active}\n`);
  }
  stream.write(`  Active step: ${report.plan.activeStep ? `${report.plan.activeStep.id}: ${report.plan.activeStep.title}` : 'none'}\n`);
  if (report.checkpoint) {
    stream.write(`  Last checkpoint: ${report.checkpoint.timestamp ?? 'never'} (commit: ${report.checkpoint.lastCommitHash ?? 'none'})\n`);
    stream.write(`  Working memory: ${report.checkpoint.constraintsCount} constraints, ${report.checkpoint.decisionsCount} decisions\n`);
  }
  for (const f of report.findings) stream.write(`${renderFinding(f)}\n`);
}
