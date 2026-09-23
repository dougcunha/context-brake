import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2];
const distRoot = process.argv[3];
const module = await import(pathToFileURL(join(distRoot, 'dist/src/core/contracts/configuration.js')).href);
writeFileSync(join(root, 'context-brake.config.json'), JSON.stringify(module.DEFAULT_CONFIG), 'utf8');
console.log('config written');
