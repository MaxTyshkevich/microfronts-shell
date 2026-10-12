import { useMutation } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Badge, Button } from "@microfronts/ui";
import { logout as endSession } from "../../entities/session";
import { useHost } from "../providers/host-provider";

export function ShellLayout() {
  const host = useHost();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => endSession(host.apiBaseUrl),
    onSuccess: async () => {
      await host.onSession({ user: null });
      navigate("/catalog", { replace: true });
    },
  });
  return (
    <main className="shell:w-[calc(100%-32px)] shell:max-w-[1120px] shell:mx-auto shell:py-10 shell:[@media(max-width:820px)]:py-6">
      <header className="shell:grid shell:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] shell:gap-6 shell:items-end shell:mb-7 shell:[@media(max-width:820px)]:grid-cols-1">
        <div className="shell:[&>.mf-badge]:inline-flex shell:[&>.mf-badge]:items-center shell:[&>.mf-badge]:min-h-7 shell:[&>.mf-badge]:px-2.5 shell:[&>.mf-badge]:rounded-full shell:[&>.mf-badge]:text-[13px] shell:[&>.mf-badge]:font-bold shell:[&>.mf-badge]:text-[#176044] shell:[&>.mf-badge]:bg-[#d8f3e7]">
          <Badge tone="green">Microfronts Lab</Badge>
          <h1 className="shell:mt-3 shell:text-[clamp(36px,7vw,72px)] shell:leading-[0.95]">
            Магазин
          </h1>
        </div>
        <p className="shell:m-0 shell:text-[#536175] shell:text-[17px] shell:leading-[1.6]">
          Каталог, корзина и ваш аккаунт.
        </p>
      </header>
      <nav
        className="shell:flex shell:flex-wrap shell:items-center shell:gap-3 shell:mb-7"
        aria-label="Основная навигация"
      >
        <NavLink
          className="shell:text-[#174a8b] shell:px-3.5 shell:py-2.5 shell:no-underline shell:rounded-lg shell:aria-[current=page]:bg-[#dbeafe] shell:aria-[current=page]:font-bold"
          to="/catalog"
        >
          Каталог
        </NavLink>
        <NavLink
          className="shell:text-[#174a8b] shell:px-3.5 shell:py-2.5 shell:no-underline shell:rounded-lg shell:aria-[current=page]:bg-[#dbeafe] shell:aria-[current=page]:font-bold"
          to="/cart"
        >
          Корзина
        </NavLink>
        {host.user ? (
          <>
            <NavLink
              className="shell:text-[#174a8b] shell:px-3.5 shell:py-2.5 shell:no-underline shell:rounded-lg shell:aria-[current=page]:bg-[#dbeafe] shell:aria-[current=page]:font-bold"
              to="/account"
            >
              Мой аккаунт
            </NavLink>
            <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
              Выйти
            </Button>
          </>
        ) : (
          <>
            <NavLink
              className="shell:text-[#174a8b] shell:px-3.5 shell:py-2.5 shell:no-underline shell:rounded-lg shell:aria-[current=page]:bg-[#dbeafe] shell:aria-[current=page]:font-bold"
              to="/login"
            >
              Вход
            </NavLink>
            <NavLink
              className="shell:text-[#174a8b] shell:px-3.5 shell:py-2.5 shell:no-underline shell:rounded-lg shell:aria-[current=page]:bg-[#dbeafe] shell:aria-[current=page]:font-bold"
              to="/register"
            >
              Регистрация
            </NavLink>
          </>
        )}
      </nav>
      {logout.error && <p role="alert">{logout.error.message}</p>}
      <Outlet />
    </main>
  );
}
