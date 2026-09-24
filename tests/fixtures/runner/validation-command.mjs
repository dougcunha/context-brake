import process from 'node:process';

const [mode, value] = process.argv.slice(2);

if (mode === 'exit') {
  process.stdout.write(`stdout:${value}\n`);
  process.stderr.write('stderr:line\n');
  process.exitCode = Number(value);
} else if (mode === 'flood') {
  process.stdout.write(`${'x'.repeat(Number(value))}\nFLOOD-END\n`);
  process.exitCode = 3;
} else if (mode === 'relay') {
  process.stdin.setEncoding('utf8');
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => { process.stdout.write(input.toUpperCase()); });
} else if (mode === 'cwd') {
  process.stdout.write(process.cwd());
}
