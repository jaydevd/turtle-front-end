export interface TokenPair {
  access: string;
  refresh: string;
}

const STORAGE_KEY = 'habit-tracker-tokens';

/**
 * Tokens live in localStorage because the backend offers no cookie session and
 * SimpleJWT is header-based. Note that logout does not revoke the refresh token
 * server side (`token_blacklist` is not installed), so clearing this is the only
 * thing that ends the session.
 */
export function readTokens(): TokenPair | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TokenPair>;
    if (typeof parsed.access !== 'string' || typeof parsed.refresh !== 'string') {
      return null;
    }
    return { access: parsed.access, refresh: parsed.refresh };
  } catch {
    return null;
  }
}

export function writeTokens(tokens: TokenPair): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
