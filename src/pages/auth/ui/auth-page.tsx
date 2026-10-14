import { useAuthentication, type AuthFields } from "../model/use-authentication";
import { safeReturnTo } from "../lib/safe-return-to";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { Button, Input, Panel } from "@microfronts/ui";
import type { Session } from "../../../entities/session";

export function AuthPage({
  mode,
  api,
  guestKey,
  onSession,
}: {
  mode: "login" | "register";
  api: string;
  guestKey: string;
  onSession: (session: Session) => Promise<void>;
}) {
  const registration = mode === "register";
  const [search] = useSearchParams();
  const returnTo = safeReturnTo(search.get("returnTo"));
  const { control, handleSubmit, getValues } = useForm<AuthFields>({
    defaultValues: { name: "", email: "", password: "", confirmation: "" },
  });
  const mutation = useAuthentication({ api, mode, guestKey, onSession, returnTo });
  return (
    <div className="shell:max-w-[480px] shell:mx-auto shell:[&>.mf-panel]:min-h-[340px] shell:[&>.mf-panel]:p-5 shell:[&>.mf-panel]:border shell:[&>.mf-panel]:border-[#d8dee8] shell:[&>.mf-panel]:rounded-lg shell:[&>.mf-panel]:bg-white shell:[&>.mf-panel>h2]:mb-4 shell:[&>.mf-panel>h2]:text-lg shell:[&_[data-slot=field]]:grid shell:[&_[data-slot=field]]:gap-[7px] shell:[&_[data-slot=field-error]]:text-[#a32121]">
      <Panel title={registration ? "Регистрация" : "Вход"}>
        <p>
          {registration
            ? "Создайте аккаунт, чтобы сохранить свою корзину."
            : "Войдите в свой аккаунт."}
        </p>
        <form
          className="shell:grid shell:gap-[18px] shell:my-6"
          onSubmit={handleSubmit((fields) => mutation.mutate(fields))}
          noValidate
        >
          {registration && (
            <Input
              className="shell:block shell:w-full shell:p-3 shell:border shell:border-[#aebccc] shell:rounded-lg shell:bg-white shell:text-[#18212f] shell:[font:inherit]"
              label="Имя"
              name="name"
              control={control}
              autoComplete="name"
              rules={{
                required: "Введите имя",
                maxLength: { value: 80, message: "Максимум 80 символов" },
                validate: (value) => !!value.trim() || "Введите имя",
              }}
            />
          )}
          <Input
            className="shell:block shell:w-full shell:p-3 shell:border shell:border-[#aebccc] shell:rounded-lg shell:bg-white shell:text-[#18212f] shell:[font:inherit]"
            label="Email"
            name="email"
            control={control}
            type="email"
            autoComplete="email"
            rules={{
              required: "Введите email",
              maxLength: { value: 254, message: "Максимум 254 символа" },
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Укажите корректный email" },
            }}
          />
          <Input
            className="shell:block shell:w-full shell:p-3 shell:border shell:border-[#aebccc] shell:rounded-lg shell:bg-white shell:text-[#18212f] shell:[font:inherit]"
            label="Пароль"
            name="password"
            control={control}
            type="password"
            autoComplete={registration ? "new-password" : "current-password"}
            rules={{
              required: "Введите пароль",
              minLength: { value: 12, message: "Минимум 12 символов" },
              maxLength: { value: 128, message: "Максимум 128 символов" },
            }}
          />
          {registration && (
            <Input
              className="shell:block shell:w-full shell:p-3 shell:border shell:border-[#aebccc] shell:rounded-lg shell:bg-white shell:text-[#18212f] shell:[font:inherit]"
              label="Повторите пароль"
              name="confirmation"
              control={control}
              type="password"
              autoComplete="new-password"
              rules={{
                validate: (value) => value === getValues("password") || "Пароли не совпадают",
              }}
            />
          )}
          {mutation.error && (
            <p role="alert" className="shell:text-[#a32121]">
              {mutation.error.message}
            </p>
          )}
          <Button className="shell:min-h-11" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Подождите…" : registration ? "Создать аккаунт" : "Войти"}
          </Button>
        </form>
        <p>
          <Link
            className="shell:text-[#174a8b]"
            to={`${registration ? "/login" : "/register"}?returnTo=${encodeURIComponent(returnTo)}`}
          >
            {registration ? "Уже есть аккаунт? Войти" : "Создать аккаунт"}
          </Link>
        </p>
      </Panel>
    </div>
  );
}
