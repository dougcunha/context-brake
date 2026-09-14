import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';

await setTimeout(1_500);
await writeFile(process.argv[2], 'survived', 'utf8');
