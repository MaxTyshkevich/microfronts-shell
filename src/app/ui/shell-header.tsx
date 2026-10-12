import { Link, NavLink } from "react-router";
import { Button } from "@microfronts/ui";
import type { SessionUser } from "../../entities/session";

const navClass = "shell:px-3 shell:py-2 shell:rounded-lg shell:text-[#334155] shell:no-underline shell:hover:bg-[#edf2fa] shell:aria-[current=page]:bg-[#dbeafe] shell:aria-[current=page]:text-[#174a8b] shell:focus-visible:outline-2 shell:focus-visible:outline-offset-4";

export function ShellHeader({ user, status, logoutPending, onLogout }: {
  user: SessionUser | null;
  status: "pending" | "error" | "ready";
  logoutPending: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="shell:bg-white shell:border-b shell:border-[#e2e8f0]">
      <div className="shell:w-[calc(100%-32px)] shell:max-w-[1120px] shell:mx-auto shell:flex shell:flex-wrap shell:items-center shell:justify-between shell:gap-4 shell:py-5">
        <Link to="/" className="shell:text-xl shell:font-bold shell:tracking-tight shell:text-[#18212f] shell:no-underline">
          Microfronts <span className="shell:text-[#176044]">Lab</span>
        </Link>
        <nav aria-label="Основная навигация" className="shell:flex shell:flex-wrap shell:items-center shell:gap-2">
          <NavLink className={navClass} to="/catalog">Каталог</NavLink>
          <NavLink className={navClass} to="/cart">Корзина</NavLink>
          {status === "pending" ? (
            <span role="status" className="shell:px-3 shell:text-sm shell:text-[#536175]">Проверяем сессию…</span>
          ) : user ? (
            <>
              <NavLink className={navClass} to="/account">Мой аккаунт</NavLink>
              <Button onClick={onLogout} disabled={logoutPending}>
                {logoutPending ? "Выходим…" : "Выйти"}
              </Button>
            </>
          ) : (
            <>
              <NavLink className={navClass} to="/login">Вход</NavLink>
              <NavLink className={navClass} to="/register">Регистрация</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
