/**
 * Per-group lock to ensure only one AI response is generated at a time.
 * Prevents multiple overlapping messages and conversation spam.
 */

interface Mutex {
  locked: boolean;
  queue: Array<() => void>;
}

const mutexes = new Map<string, Mutex>();

function getMutex(groupId: string): Mutex {
  let m = mutexes.get(groupId);
  if (!m) {
    m = { locked: false, queue: [] };
    mutexes.set(groupId, m);
  }
  return m;
}

export async function acquireGroupLock(groupId: string): Promise<() => void> {
  const m = getMutex(groupId);

  await new Promise<void>((resolve) => {
    const tryAcquire = () => {
      if (!m.locked) {
        m.locked = true;
        resolve();
      } else {
        m.queue.push(tryAcquire);
      }
    };
    tryAcquire();
  });

  return () => {
    m.locked = false;
    const next = m.queue.shift();
    if (next) next();
    else mutexes.delete(groupId);
  };
}

export function releaseGroupLock(groupId: string): void {
  mutexes.delete(groupId);
}
