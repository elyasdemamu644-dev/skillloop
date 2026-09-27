import crypto from "crypto";

// Generates a URL-safe random token and its SHA-256 hash.
// The raw token is emailed/returned to the user once; only the hash is
// ever persisted, so a leaked database can't be used to reset passwords.
export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
