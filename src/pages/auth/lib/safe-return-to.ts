export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/account';
  const parsed = new URL(value, window.location.origin);
  return parsed.origin === window.location.origin && !['/login', '/register'].includes(parsed.pathname) ? parsed.pathname + parsed.search + parsed.hash : '/account';
}
