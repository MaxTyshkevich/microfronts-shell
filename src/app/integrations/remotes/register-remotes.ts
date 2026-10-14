import { registerRemotes, loadRemote } from "@module-federation/runtime";
import type { AppConfig } from "../../config/config";
import type { CatalogProps, CartProps } from "@microfronts/contracts";
import { lazy, type ComponentType } from "react";

type RemoteConfig = AppConfig["remotes"][keyof AppConfig["remotes"]];

export function registerMicrofrontends(config: AppConfig) {
  const { catalog, cart } = config.remotes;
  registerRemotes([catalog, cart].map(({ name, entry, type }) => ({ name, entry, type })));
  const CatalogApp = createLazyMicrofrontend<CatalogProps>(catalog, config.remoteLoadTimeoutMs);
  const CartApp = createLazyMicrofrontend<CartProps>(cart, config.remoteLoadTimeoutMs);
  return { CatalogApp, CartApp };
}

export type Remotes = ReturnType<typeof registerMicrofrontends>;

function createLazyMicrofrontend<Props extends object>(remote: RemoteConfig, timeoutMs: number) {
  return lazy(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const module = await Promise.race([
        loadRemote<{ default: ComponentType<Props> }>(remote.moduleId),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Timeout loading remote: " + remote.moduleId)),
            timeoutMs,
          );
        }),
      ]);
      if (!module?.default) {
        throw new Error("Invalid remote module: " + remote.moduleId);
      }
      return module;
    } finally {
      clearTimeout(timer);
    }
  });
}
