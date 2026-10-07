import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { evaluateBudget, parseVitestReport } from './test-budget.js';

const VITEST_ENTRY = resolve('node_modules/vitest/vitest.mjs');
const BUILT_CLI = resolve('dist/src/cli/main.js');
const RUN_TIMEOUT_MILLISECONDS = 20 * 60 * 1000;
const MILLISECONDS_PER_SECOND = 1000;

function runVitest(reportPath: string): Promise<number | null> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [VITEST_ENTRY, 'run', '--reporter=json', `--outputFile=${reportPath}`], { stdio: ['ignore', 'ignore', 'inherit'] });
    const timer = setTimeout(() => { child.kill(); }, RUN_TIMEOUT_MILLISECONDS);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); resolvePromise(code); });
  });
}

async function readReport(reportPath: string): Promise<ReturnType<typeof parseVitestReport> | null> {
  try {
    return parseVitestReport(JSON.parse(await readFile(reportPath, 'utf8')) as unknown);
  } catch (error) {
    process.stderr.write(`[ERROR] TEST_RUN_FAILED: could not read the Vitest report at ${reportPath}: ${error instanceof Error ? error.message : String(error)}\n`);
    return null;
  }
}

async function main(): Promise<number> {
  try {
    await access(BUILT_CLI);
  } catch {
    process.stderr.write('[ERROR] TEST_RUN_FAILED: dist/ is missing; run npm run build before npm run test:budget.\n');
    return 1;
  }
  const directory = await mkdtemp(join(tmpdir(), 'cb-test-budget-'));
  try {
    const reportPath = join(directory, 'report.json');
    const started = performance.now();
    const vitestExitCode = await runVitest(reportPath);
    const wallSeconds = (performance.now() - started) / MILLISECONDS_PER_SECOND;
    const report = await readReport(reportPath);
    if (report === null) return 1;
    const result = evaluateBudget({ report, wallSeconds, root: process.cwd(), vitestExitCode });
    for (const line of result.stdout) process.stdout.write(`${line}\n`);
    for (const line of result.stderr) process.stderr.write(`${line}\n`);
    return result.exitCode;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

process.exitCode = await main();
