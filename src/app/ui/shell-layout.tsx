import { Outlet } from "react-router";
import { useSession } from "../../entities/session";
import { config } from "../config/config";
import { useLogout } from "../model/use-logout";
import { ShellHeader } from "./shell-header";
import { ShellFooter } from "./shell-footer";

export function ShellLayout() {
  const session = useSession(config.apiBaseUrl);
  const user = session.isSuccess ? session.data.user : null;
  const status = session.isPending ? "pending" : session.isError ? "error" : "ready";
  const logout = useLogout();
  return (
    <div className="shell:min-h-dvh shell:flex shell:flex-col">
      <a href="#main-content" className="shell:sr-only shell:focus:not-sr-only shell:focus:p-3">К содержимому</a>
      <ShellHeader user={user} status={status} logoutPending={logout.isPending} onLogout={() => logout.mutate()} />
      <main id="main-content" tabIndex={-1} className="shell:w-[calc(100%-32px)] shell:max-w-[1120px] shell:mx-auto shell:flex-1 shell:py-10 shell:[@media(max-width:820px)]:py-6">
        {logout.error && <p role="alert" className="shell:mb-6 shell:text-[#a32121]">{logout.error.message}</p>}
        <Outlet />
      </main>
      <ShellFooter />
    </div>
  );
}
