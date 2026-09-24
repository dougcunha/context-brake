import process from 'node:process';

export function interruptGroup(pid: number): boolean {
  try {
    process.kill(-pid, 'SIGINT');
    return true;
  } catch {
    return false;
  }
}

export function killGroup(pid: number): void {
  try {
    process.kill(-pid, 'SIGKILL');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}
