import process from 'node:process';

const EXPECTED_EVENT = 'PreToolUse';

process.stdin.resume();
process.stdin.on('end', () => { process.exit(process.argv[2] === EXPECTED_EVENT ? 0 : 1); });
