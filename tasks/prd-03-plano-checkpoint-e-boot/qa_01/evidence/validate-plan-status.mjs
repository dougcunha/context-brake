import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [reportPath, distRoot] = process.argv.slice(2);
const module = await import(pathToFileURL(join(distRoot, 'dist/src/core/contracts/diagnostics.js')).href);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const result = module.planStatusReportSchema.safeParse(report);
console.log(result.success ? 'VALID' : `INVALID ${JSON.stringify(result.error?.issues ?? result.error)}`);
