import 'server-only';
import { cookies } from 'next/headers';

const BASE = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Server-side fetch that forwards the session cookie. Never cached. */
export async function serverApi<T = any>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  try {
    const res = await fetch(`${BASE}/api${path}`, { headers: { cookie: cookieHeader }, cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
