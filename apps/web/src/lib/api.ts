// Unified API client for all web features
// Consolidates duplicate apiRequest implementations from:
// - @/features/public-booking/api.ts
// - @/features/customer-portal/api.ts
// - @/features/console/api.ts

import { getAccessToken } from './auth';
import { getImpersonationState } from './impersonation';

const apiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export interface ApiRequestOptions extends RequestInit {
  path: string;
  requireAuth?: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getAccessToken();

  // Development mode: use dev bypass
  if (import.meta.env.DEV) {
    const devUserId = localStorage.getItem('dev_user_id');
    console.log('[API] Dev mode, dev_user_id:', devUserId);
    if (devUserId) {
      headers['x-user-id'] = devUserId;
      const devUserEmail = localStorage.getItem('dev_user_email');
      const devUserRole = localStorage.getItem('dev_user_role');
      if (devUserEmail) headers['x-user-email'] = devUserEmail;
      if (devUserRole) headers['x-user-role'] = devUserRole;
      console.log('[API] Using dev bypass headers:', headers);
      return headers;
    }
  }

  if (token) {
    headers.authorization = `Bearer ${token}`;
    console.log('[API] Using Bearer token');
    return headers;
  }

  console.log('[API] No auth headers');
  return headers;
}

/**
 * Core API request function with standardized error handling
 *
 * @example
 * const result = await apiRequest<User>({
 *   path: '/v1/users/123',
 *   requireAuth: true
 * });
 *
 * if (result.ok) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error, result.status);
 * }
 */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<ApiResult<T>> {
  const { path, requireAuth = false, ...fetchOptions } = options;

  try {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    };

    if (requireAuth) {
      const authHeaders = await getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const impersonation = getImpersonationState();
    const allowImpersonationHeader =
      !path.startsWith('/v1/platform/') || path.startsWith('/v1/platform/impersonation/');

    if (impersonation && allowImpersonationHeader) {
      headers['x-impersonated-user-id'] = impersonation.userId;
    }

    const response = await fetch(`${apiBase}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let message = `Request failed (${response.status}).`;
      if (isJson) {
        try {
          const body = (await response.json()) as { message?: string; errorKey?: string };
          message = body?.message ?? body?.errorKey ?? message;
        } catch {
          // ignore parse errors
        }
      }
      return { ok: false, error: message, status: response.status };
    }

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    if (!isJson) {
      const text = await response.text();
      return {
        ok: false,
        error: `Expected JSON but got "${contentType || 'unknown'}". ${text.slice(0, 120)}`,
        status: response.status,
      };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

// Convenience methods for common HTTP verbs

/**
 * GET request
 * @example get<User>('/v1/users/123')
 * @example get<User[]>('/v1/users', { requireAuth: true })
 */
export function get<T>(
  path: string,
  options: Omit<ApiRequestOptions, 'path' | 'method'> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>({ ...options, path, method: 'GET' });
}

/**
 * POST request
 * @example post<User>('/v1/users', { name: 'John' })
 */
export function post<T>(
  path: string,
  body: unknown,
  options: Omit<ApiRequestOptions, 'path' | 'method' | 'body'> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>({
    ...options,
    path,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 * @example put<User>('/v1/users/123', { name: 'John' })
 */
export function put<T>(
  path: string,
  body: unknown,
  options: Omit<ApiRequestOptions, 'path' | 'method' | 'body'> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>({
    ...options,
    path,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request
 * @example patch<User>('/v1/users/123', { name: 'John' })
 */
export function patch<T>(
  path: string,
  body: unknown,
  options: Omit<ApiRequestOptions, 'path' | 'method' | 'body'> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>({
    ...options,
    path,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 * @example del<void>('/v1/users/123')
 */
export function del<T>(
  path: string,
  options: Omit<ApiRequestOptions, 'path' | 'method'> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>({ ...options, path, method: 'DELETE' });
}

// Helper to check if request succeeded
export function isOk<T>(result: ApiResult<T>): result is { ok: true; data: T } {
  return result.ok === true;
}

// Helper to unwrap data or throw
export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}
