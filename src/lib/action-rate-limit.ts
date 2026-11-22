import "server-only";

type Window = { attempts: number; expiresAt: number };
const windows = new Map<string, Window>();
const maxKeys = 2048;

export function consumeActionRate(key: string, limit: number, now = Date.now()) {
  let window = windows.get(key);
  if (!window || window.expiresAt <= now) {
    for (const [entry, value] of windows) {
      if (value.expiresAt <= now) windows.delete(entry);
    }
    if (windows.size >= maxKeys) return { allowed: false, retryAfter: 60 };
    window = { attempts: 0, expiresAt: now + 60_000 };
    windows.set(key, window);
  }
  window.attempts += 1;
  return { allowed: window.attempts <= limit, retryAfter: Math.max(1, Math.ceil((window.expiresAt - now) / 1000)) };
}

export function actionRateMessage(key: string, limit = 60) {
  const result = consumeActionRate(key, limit);
  return result.allowed ? undefined : "Too many demo actions. Try again in " + result.retryAfter + " seconds.";
}
