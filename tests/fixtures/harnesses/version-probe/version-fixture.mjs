import process from 'node:process';
import { setInterval } from 'node:timers';

const mode = process.argv[2];
const outputByMode = {
  old: 'Harness 1.4.0',
  prerelease: 'Harness 2.0.0-beta.2',
  current: 'Harness 2.0.0+build.7',
  malformed: 'Harness development build',
};

if (mode === 'timeout') {
  setInterval(() => undefined, 1_000);
} else if (mode === 'echo') {
  process.stdout.write(process.argv[3] ?? '');
} else {
  process.stdout.write(outputByMode[mode] ?? '');
}
