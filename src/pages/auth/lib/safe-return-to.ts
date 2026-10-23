export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value))
    return "/catalog";
  const parsed = new URL(value, window.location.origin);
  const pathname = parsed.pathname.replace(/\/+$/, "");
  const allowed = ["/catalog", "/cart", "/account"].includes(pathname)
    || /^\/catalog\/products\/[^/]+$/.test(pathname);
  return parsed.origin === window.location.origin && allowed
    ? parsed.pathname + parsed.search + parsed.hash
    : "/catalog";
}
