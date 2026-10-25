/**
 * Throttler tracker for `/auth/*`: one bucket per IP + normalized login
 * (SPEC C3/C15). The 6th attempt inside the window → 429. Routes without a
 * login in the body (refresh/logout) fall back to a pure per-IP bucket.
 */
interface TrackerRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
  body?: unknown;
}

function readLogin(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    return '';
  }
  const email = (body as { email?: unknown }).email;
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function ipAndLoginTracker(req: TrackerRequest): string {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  return `${ip}|${readLogin(req.body)}`;
}

/** `/auth/*` is stricter than the global bucket: 5 attempts per minute (C3/C15). */
export const AUTH_RATE_LIMIT = 5;
export const AUTH_RATE_WINDOW_MS = 60_000;
