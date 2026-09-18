import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Input, Panel } from '@microfronts/ui';
import { authRequest, type Session } from './auth-api';

interface Fields { name: string; email: string; password: string; confirmation: string }
export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/account';
  const parsed = new URL(value, window.location.origin);
  return parsed.origin === window.location.origin && !['/login', '/register'].includes(parsed.pathname) ? parsed.pathname + parsed.search + parsed.hash : '/account';
}
export function AuthPage({ mode, api, guestKey, onSession }: {
  mode: 'login' | 'register'; api: string; guestKey: string; onSession: (session: Session) => Promise<void>;
}) {
  const registration = mode === 'register';
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const returnTo = safeReturnTo(search.get('returnTo'));
  const { control, handleSubmit, getValues } = useForm<Fields>({ defaultValues: { name: '', email: '', password: '', confirmation: '' } });
  const mutation = useMutation({
    retry: false,
    mutationFn: (fields: Fields) => authRequest(api, mode, {
      method: 'POST', headers: { 'X-Cart-Key': guestKey },
      body: JSON.stringify({ email: fields.email, password: fields.password, ...(registration ? { name: fields.name } : {}) }),
    }),
    onSuccess: async session => { await onSession(session); navigate(returnTo, { replace: true }); },
  });
  return <div className="auth-page"><Panel title={registration ? 'Регистрация' : 'Вход'}>
    <p>{registration ? 'Создайте аккаунт, чтобы сохранить свою корзину.' : 'Войдите в свой аккаунт.'}</p>
    <form onSubmit={handleSubmit(fields => mutation.mutate(fields))} noValidate>
      {registration && <Input label="Имя" name="name" control={control} autoComplete="name" rules={{ required: 'Введите имя', maxLength: { value: 80, message: 'Максимум 80 символов' }, validate: value => !!value.trim() || 'Введите имя' }} />}
      <Input label="Email" name="email" control={control} type="email" autoComplete="email" rules={{ required: 'Введите email', maxLength: { value: 254, message: 'Максимум 254 символа' }, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Укажите корректный email' } }} />
      <Input label="Пароль" name="password" control={control} type="password" autoComplete={registration ? 'new-password' : 'current-password'} rules={{ required: 'Введите пароль', minLength: { value: 12, message: 'Минимум 12 символов' }, maxLength: { value: 128, message: 'Максимум 128 символов' } }} />
      {registration && <Input label="Повторите пароль" name="confirmation" control={control} type="password" autoComplete="new-password" rules={{ validate: value => value === getValues('password') || 'Пароли не совпадают' }} />}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
      <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Подождите…' : registration ? 'Создать аккаунт' : 'Войти'}</Button>
    </form>
    <p><Link to={`${registration ? '/login' : '/register'}?returnTo=${encodeURIComponent(returnTo)}`}>{registration ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}</Link></p>
  </Panel></div>;
}
