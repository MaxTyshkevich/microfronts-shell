import type { User } from '@microfronts/contracts';
export interface Session { user: User | null }
export async function authRequest(api: string, path: string, options: RequestInit = {}): Promise<Session> {
  const response = await fetch(api.replace(/\/$/, '') + '/auth/' + path, {
    ...options, credentials: 'include', cache: 'no-store',
    signal: options.signal ?? AbortSignal.timeout(90000),
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'microfronts', ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : `API: HTTP ${response.status}`);
  if (!body || !('user' in body)) throw new Error('Некорректный ответ сервера');
  return body;
}
