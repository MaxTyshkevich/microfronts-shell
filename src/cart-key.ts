// The host owns the key and passes it to every remote as a plain prop.
export function getCartKey(): string {
  const storageKey = "microfronts.demo-cart.v1";
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return saved;
  } catch { /* Storage may be unavailable; the host retains the returned key. */ }
  const key = crypto.randomUUID();
  try { localStorage.setItem(storageKey, key); } catch { /* In-memory session. */ }
  return key;
}
