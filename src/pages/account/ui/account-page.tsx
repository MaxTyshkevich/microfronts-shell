import { Panel } from "@microfronts/ui";
import type { Session } from "../../../entities/session";

export function AccountPage({ user }: { user: NonNullable<Session["user"]> }) {
  return (
    <div className="shell:[&>.mf-panel]:min-h-[340px] shell:[&>.mf-panel]:p-5 shell:[&>.mf-panel]:border shell:[&>.mf-panel]:border-[#d8dee8] shell:[&>.mf-panel]:rounded-lg shell:[&>.mf-panel]:bg-white shell:[&>.mf-panel>h2]:mb-4 shell:[&>.mf-panel>h2]:text-lg">
      <Panel title="Мой аккаунт">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <p>Роль: {user.role === "ADMIN" ? "Администратор" : "Пользователь"}</p>
        <p>Ваша корзина сохранена в аккаунте.</p>
      </Panel>
    </div>
  );
}
