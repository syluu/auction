'use client';
/** Browser-side API client. Cookies travel with credentials: 'include'. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(body?.code ?? body?.message ?? `HTTP ${status}`);
  }
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...rest,
      credentials: 'include',
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (e) {
    throw new ApiError(0, { code: 'NETWORK' });
  }
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, body ?? { code: 'HTTP_' + res.status });
  return body as T;
}

function safeJson(t: string) { try { return JSON.parse(t); } catch { return { raw: t }; } }

export const imageUrl = (u: string | undefined | null) => (!u ? null : u.startsWith('/') ? `${API_URL}${u}` : u);
