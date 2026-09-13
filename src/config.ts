export interface RuntimeConfig { schemaVersion: 1; apiBaseUrl: string; remotes: { catalog: string; cart: string } }
export async function readConfig(): Promise<RuntimeConfig> {
  const response = await fetch('/runtime-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить runtime-config.json');
  const config = await response.json() as RuntimeConfig;
  if (config.schemaVersion !== 1 || typeof config.apiBaseUrl !== 'string') throw new Error('Неподдерживаемая конфигурация');
  for (const name of ['catalog', 'cart'] as const) {
    const url = new URL(config.remotes?.[name]);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Неверный URL remote');
    if (location.protocol === 'https:' && url.protocol !== 'https:') throw new Error('HTTPS Shell требует HTTPS remote');
  }
  return config;
}
