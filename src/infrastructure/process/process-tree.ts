import { execFile, type ChildProcess } from 'node:child_process';
import process from 'node:process';

function killWindowsTree(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!child.pid) {
      resolve();
      return;
    }
    execFile('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true }, () => resolve());
  });
}

function killPosixTree(child: ChildProcess): Promise<void> {
  if (!child.pid) {
    child.kill('SIGKILL');
    return Promise.resolve();
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (cause) {
    if (!child.kill('SIGKILL')) return Promise.reject(new Error('Unable to stop timed-out process tree.', { cause }));
  }
  return Promise.resolve();
}

export function killProcessTree(child: ChildProcess): Promise<void> {
  return process.platform === 'win32' ? killWindowsTree(child) : killPosixTree(child);
}
