import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { setInterval } from 'node:timers';
import { URL, fileURLToPath } from 'node:url';

const markerPath = process.argv[2];
const readyPath = process.argv[3];
const childPath = fileURLToPath(new URL('process-tree-child.mjs', import.meta.url));

spawn(process.execPath, [childPath, markerPath], { stdio: 'ignore' });
await writeFile(readyPath, 'ready', 'utf8');
setInterval(() => undefined, 1_000);
