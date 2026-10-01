export interface JwtClaims {
  /** Subject, holding the user UUID. */
  user_id?: string;
  exp?: number;
  iat?: number;
  token_type?: string;
}

function decodeSegment(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
}

/** Reads the payload without verifying the signature. Never trust it. */
export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(decodeSegment(parts[1])) as JwtClaims;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const claims = decodeJwt(token);
  if (!claims?.exp) return false;
  return claims.exp - skewSeconds <= Math.floor(Date.now() / 1000);
}

export function getTokenUserId(token: string): string | null {
  return decodeJwt(token)?.user_id ?? null;
}
