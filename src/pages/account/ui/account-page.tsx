import { Panel } from "@microfronts/ui";
import type { Session } from "../../../entities/session";

export function AccountPage({ user }: { user: NonNullable<Session["user"]> }) {
  return (
    <Panel title="Мой аккаунт">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>Ваша корзина сохранена в аккаунте.</p>
    </Panel>
  );
}
