import { clearTokens, readTokens, writeTokens } from '@/lib/auth/storage';
import type { ApiFailure } from '@/types/api';

/**
 * A single transport that absorbs every inconsistency in the Django API so no
 * component ever has to think about them.
 *
 * Handled here:
 * - `{ status, message, data }` success envelope, unwrapped to `data`.
 * - 204 / empty bodies (every DELETE) resolving to `undefined`.
 * - Validation failures arriving as HTTP **411** with `errors` keyed by field.
 * - DRF's non-enveloped `{ detail }` on 401/403.
 * - Bare JSON **string** bodies, which the auth views return on failure.
 * - HTML error pages when a route does not resolve.
 * - One transparent token refresh and retry on 401.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'
).replace(/\/$/, '');

/** Statuses the backend uses for validation failures. */
const VALIDATION_STATUS = 411;

export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string | string[]>;

  constructor(
    status: number,
    message: string,
    errors: Record<string, string | string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  /** True when the failure was field-level input validation. */
  get isValidation(): boolean {
    return this.status === VALIDATION_STATUS;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** First available message for a field, if the server named one. */
  fieldError(field: string): string | undefined {
    const value = this.errors[field];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}

interface ClientConfig {
  onSessionExpired?: () => void;
}

let sessionExpiredHandler: (() => void) | undefined;

export function configureApiClient(config: ClientConfig): void {
  sessionExpiredHandler = config.onSessionExpired;
}

/** Drops local credentials and notifies the app that the session ended. */
export function endSession(): void {
  clearTokens();
  sessionExpiredHandler?.();
}

/* ------------------------------------------------------------------ */
/* Response parsing                                                    */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Flattens DRF's error payload into `field -> messages`. DRF nests errors for
 * nested serializers (e.g. `{ schedule: { weekdays: [...] } }`), so nested
 * objects are recursed into using dotted keys while still leaving the top-level
 * field keys intact for `fieldError`.
 */
function normalizeErrors(
  raw: unknown,
  prefix = '',
): Record<string, string | string[]> {
  if (!isRecord(raw)) return {};
  const entries: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries[path] = value;
    } else if (Array.isArray(value)) {
      entries[path] = value.map((item) => String(item));
    } else if (isRecord(value)) {
      Object.assign(entries, normalizeErrors(value, path));
    }
  }
  return entries;
}

function isDetailError(value: Record<string, unknown>): boolean {
  return typeof value.detail === 'string';
}

/**
 * Turns a non-2xx response into an `ApiError`, coping with all four shapes the
 * backend can produce: envelope, DRF detail, bare string, and HTML.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const fallback = `Request failed with status ${response.status}`;
  let body: unknown;

  try {
    const text = await response.text();
    if (!text) {
      return new ApiError(response.status, response.statusText || fallback);
    }
    try {
      body = JSON.parse(text);
    } catch {
      // Django's plain-text or HTML 404 page.
      const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 180);
      return new ApiError(response.status, snippet || fallback);
    }
  } catch {
    return new ApiError(response.status, fallback);
  }

  if (typeof body === 'string') {
    // The auth views return bare JSON strings such as "Server Error".
    return new ApiError(response.status, body, {});
  }

  if (isRecord(body)) {
    if (isDetailError(body)) {
      return new ApiError(response.status, body.detail as string, {});
    }
    const errors = normalizeErrors(body.errors);
    const firstError = Object.values(errors)[0];
    const message =
      (typeof body.message === 'string' && body.message) ||
      (Array.isArray(firstError) ? firstError[0] : firstError) ||
      (typeof body.detail === 'string' ? body.detail : '') ||
      fallback;
    return new ApiError(response.status, message, errors);
  }

  return new ApiError(response.status, fallback);
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Internal: prevents an infinite refresh loop. */
  allowRetry?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchanges the refresh token for a new access token. Concurrent callers share
 * one in-flight request so a burst of 401s triggers a single round trip.
 */
async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refresh) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
        if (!response.ok) return null;
        const body = (await response.json()) as { access?: string };
        if (!body?.access) return null;

        // Rotation is disabled server side, so the refresh token is unchanged.
        writeTokens({ access: body.access, refresh: tokens.refresh });
        return body.access;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const tokens = readTokens();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: 'no-store',
  });

  if (response.status === 401 && options.allowRetry !== false) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return send<T>(path, { ...options, allowRetry: false });
    }
    endSession();
    return Promise.reject(new ApiError(401, 'Your session has expired. Please sign in again.'));
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  // 204 No Content, which is what every DELETE returns. No envelope at all.
  if (response.status === 204) {
    return undefined as T;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return undefined as T;
  }

  if (typeof body === 'string') {
    return body as T;
  }

  if (isRecord(body) && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    send<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => send<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => send<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => send<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => send<T>(path, { method: 'DELETE' }),
};

/** True when a thrown value came from this transport. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Best-effort user-facing message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export type { ApiFailure };
