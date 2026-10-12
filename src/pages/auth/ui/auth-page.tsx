import { safeReturnTo } from "../lib/safe-return-to";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, Input, Panel } from "@microfronts/ui";
import { authenticate, sessionKey, type Session } from "../../../entities/session";

interface Fields {
  name: string;
  email: string;
  password: string;
  confirmation: string;
}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search] = useSearchParams();
  const returnTo = safeReturnTo(search.get("returnTo"));
  const { control, handleSubmit, getValues } = useForm<Fields>({
    defaultValues: { name: "", email: "", password: "", confirmation: "" },
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: async (fields: Fields) => {
      // A delayed anonymous /me response must not overwrite a successful login.
      await queryClient.cancelQueries({ queryKey: sessionKey(api), exact: true });
      try {
        return await authenticate(api, mode, fields, guestKey);
      } catch (error) {
        void queryClient.invalidateQueries({ queryKey: sessionKey(api), exact: true });
        throw error;
      }
    },
    onSuccess: async (session) => {
      await onSession(session);
      navigate(returnTo, { replace: true });
    },
  });
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
