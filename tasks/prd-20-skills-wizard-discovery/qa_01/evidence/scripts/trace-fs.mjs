import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';

const LOG = process.env.CB_TRACE_LOG;
const MATCH = /skills/i;
const log = (api, p) => {
  if (!LOG) return;
  const s = typeof p === 'string' ? p : p instanceof URL ? p.pathname : Buffer.isBuffer(p) ? p.toString() : String(p);
  if (MATCH.test(s) && !/[\\/]dist[\\/]/.test(s)) fs.appendFileSync(LOG, `${api}\t${s}\n`);
};
const wrap = (obj, names, prefix) => {
  for (const n of names) {
    const orig = obj[n];
    if (typeof orig !== 'function') continue;
    obj[n] = function (...args) { log(`${prefix}.${n}`, args[0]); return orig.apply(this, args); };
  }
};
const names = ['readdir', 'opendir', 'open', 'stat', 'lstat', 'readFile', 'access', 'realpath', 'readlink', 'readdirSync', 'openSync', 'statSync', 'lstatSync', 'readFileSync', 'opendirSync', 'accessSync', 'realpathSync', 'existsSync'];
const appendOrig = fs.appendFileSync;
wrap(fsp, names, 'fsp');
wrap(fs.promises, names, 'fs.promises');
wrap(fs, names.filter((n) => n !== 'appendFileSync'), 'fs');
syncBuiltinESMExports();
void appendOrig;
