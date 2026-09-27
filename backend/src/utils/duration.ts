const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Parses simple duration strings like "15m", "7d", "1h" into milliseconds.
// Intentionally minimal — only supports a single number + unit, which is
// all JWT_EXPIRES_IN / REFRESH_TOKEN_EXPIRES_IN ever need.
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Invalid duration string "${duration}". Expected formats like "15m", "7d", "1h".`
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
