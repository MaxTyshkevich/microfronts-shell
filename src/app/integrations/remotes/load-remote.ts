import { lazy, type ComponentType } from "react";
import { loadRemote } from "@module-federation/runtime";

export function remote<Props extends object>(name: string) {
  return lazy(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const module = await Promise.race([
        loadRemote<{ default: ComponentType<Props> }>(name),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Timeout: " + name)), 20000);
        }),
      ]);
      if (!module?.default) throw new Error("Invalid remote module: " + name);
      return module;
    } finally {
      clearTimeout(timer);
    }
  });
}
