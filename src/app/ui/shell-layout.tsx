import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Badge, Button } from "@microfronts/ui";
import { authRequest, useSession } from "../../entities/session";
import { useHost } from "../providers/host-provider";

export function ShellLayout({ apiBaseUrl }: { apiBaseUrl: string }) {
  const host = useHost();
  const session = useSession(apiBaseUrl);
  const navigate = useNavigate();
  const actualIdentity = session.data?.user?.id ?? "guest";
  useEffect(() => {
    if (session.isSuccess && host.identity !== actualIdentity) void host.onSession(session.data);
  }, [session.isSuccess, actualIdentity, host.identity, host.onSession, session.data]);
  const logout = useMutation({
    mutationFn: () => authRequest(apiBaseUrl, "logout", { method: "POST" }),
    onSuccess: async (data) => {
      await host.onSession(data);
      navigate("/catalog", { replace: true });
    },
  });
  const ready = session.isSuccess && host.identity === actualIdentity && !logout.isPending;
  return (
    <main className="shell-page">
      <header className="shell-header">
        <div>
          <Badge tone="green">Microfronts Lab</Badge>
          <h1>Магазин</h1>
        </div>
        <p>Каталог, корзина и ваш аккаунт.</p>
      </header>
      <nav className="shell-nav" aria-label="Основная навигация">
        <NavLink to="/catalog">Каталог</NavLink>
        <NavLink to="/cart">Корзина</NavLink>
        {ready && session.data.user ? (
          <>
            <NavLink to="/account">Мой аккаунт</NavLink>
            <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
              Выйти
            </Button>
          </>
        ) : (
          <>
            <NavLink to="/login">Вход</NavLink>
            <NavLink to="/register">Регистрация</NavLink>
          </>
        )}
      </nav>
      {logout.error && <p role="alert">{logout.error.message}</p>}
      {session.isError ? (
        <div role="alert">
          Не удалось проверить сессию. {session.error.message}{" "}
          <Button onClick={() => void session.refetch()}>Повторить проверку</Button>
        </div>
      ) : !ready ? (
        <p role="status">Проверяем сессию…</p>
      ) : (
        <Outlet />
      )}
    </main>
  );
}
