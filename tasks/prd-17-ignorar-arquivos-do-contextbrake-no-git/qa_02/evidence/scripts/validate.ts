import { readFileSync } from 'node:fs';
import { installReportSchema } from 'file:///D:/MyProjects/ContextBrake/src/core/contracts/diagnostics.ts';
const docs = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { args: string; doc: unknown }[];
let bad = 0;
for (const { args, doc } of docs) { const r = installReportSchema.safeParse(doc); if (!r.success) bad++; console.log(`${r.success ? 'VALID' : 'INVALID'} ${args}${r.success ? '' : ' ' + JSON.stringify(r.error.issues)}`); }
console.log(`docs=${docs.length} invalid=${bad}`);
process.exitCode = bad === 0 ? 0 : 1;
