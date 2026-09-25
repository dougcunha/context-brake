import process from 'node:process';

export function interruptGroup(pid: number): boolean {
  try {
    process.kill(-pid, 'SIGINT');
    return true;
  } catch {
    return false;
  }
}

// Darwin answers EPERM when every process left in the group is a zombie, which happens once the leader has exited.
export function killGroup(pid: number, leaderExited = false): void {
  try {
    process.kill(-pid, 'SIGKILL');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH' || (code === 'EPERM' && leaderExited)) return;
    throw error;
  }
}
