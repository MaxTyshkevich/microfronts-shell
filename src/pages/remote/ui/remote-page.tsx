import type { ReactNode } from "react";
import { Panel } from "@microfronts/ui";

export function RemotePage({ name, children }: { name: "catalog" | "cart"; children: ReactNode }) {
  return <Panel title={name === "catalog" ? "Каталог товаров" : "Ваша корзина"}>{children}</Panel>;
}
