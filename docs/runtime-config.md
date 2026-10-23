# Настройки Shell

Shell использует стандартные переменные Vite через import.meta.env в src/app/config/config.ts. Отдельный runtime-config.json больше не создаётся и не запрашивается.

| Переменная | Значение по умолчанию | Назначение |
| --- | --- | --- |
| VITE_API_BASE_URL | /api | Адрес API для браузера |
| VITE_CATALOG_REMOTE_URL | http://localhost:5174/remoteEntry.js | Точка входа Catalog |
| VITE_CART_REMOTE_URL | http://localhost:5175/remoteEntry.js | Точка входа Cart |
| API_PROXY_TARGET | http://localhost:3000 | Backend для серверного Vite proxy, в браузер не передаётся |

Для локальной настройки скопируйте .env.example в .env.local. Переменные процесса имеют приоритет. После изменения настроек перезапустите dev-сервер. Production build требует явно заданные HTTPS-адреса remote; API должен использовать /api или HTTPS. Неверные URL останавливают запуск Vite или сборку.

main.tsx сразу отображает обычный App. В модуле App один раз регистрируются remote и создаётся router, вне рендера React. HostProvider подключает общий QueryClient; сессию загружают layout и guards через useSession. Сетевые ошибки API и загрузки remote по-прежнему обрабатываются внутри приложения.

## Почему убрали JSON

Он позволял бы подменять публичные адреса без пересборки JavaScript. Однако инфраструктура проекта создавала его при сборке и не имела отдельного механизма доставки настроек. HTTP-запрос перед запуском добавлял обязательный этап без используемой выгоды.

Теперь адреса встраиваются в JavaScript при сборке. При смене окружения или URL нужно пересобрать Shell. Замена JSON и переменных окружения уже запущенного Docker-контейнера не меняет адреса. Если инфраструктура ранее вручную подменяла JSON, этот способ больше не поддерживается. Для будущего требования «один образ на несколько окружений» runtime-конфигурацию можно вернуть отдельной задачей.

VITE_* доступны посетителю сайта: секреты в них хранить нельзя. Изменение адреса не отменяет требования совместимости контрактов remote. Nginx по-прежнему проксирует /api и поддерживает SPA-ссылки. Имя этого документа сохранено для существующих ссылок.

## Vercel и cookie сессии

`vercel.json` задаёт два rewrite в порядке обработки: `/api/:path*` направляется на `https://microfronts-api-production-f9c3.up.railway.app/api/:path*`, затем SPA-маршруты направляются на `/index.html`. API не должен попадать в SPA fallback. Запросы авторизации возвращают `Cache-Control: no-store`; кеширование API на proxy включать не нужно.

Настройка размещения:

1. В проекте Vercel для Shell установите `VITE_API_BASE_URL=/api` в Production. Если проверяете Preview, задайте это значение также для Preview. Удалите старое абсолютное значение Railway из соответствующего окружения. Значения `VITE_CATALOG_REMOTE_URL` и `VITE_CART_REMOTE_URL` сохраняются.
2. На backend сохраните `CORS_ORIGINS` с точным origin Shell, например `https://microfronts-shell.vercel.app`. Для проверки мутаций на Preview разрешите конкретный origin Preview отдельно. Proxy сохраняет исходный Origin; backend проверяет его также в CSRF guard.
3. Выпустите Shell с `vercel.json` и выполните новую сборку с обновлённой переменной. Переменные Vite встраиваются в JavaScript: изменение переменной без пересборки не меняет готовый сайт.
4. В DevTools проверьте Request URL входа: `https://microfronts-shell.vercel.app/api/auth/login`. Ответ должен установить HttpOnly cookie `microfronts_session` для домена Shell с `Path=/api`, `SameSite=Lax` и `Secure` при production HTTPS. Следующий `/api/auth/me` должен отправлять cookie и возвращать пользователя. Не копируйте значение cookie в логи или отчёты.
5. Проверьте обновление страницы, прямой переход на `/catalog`, загрузку каталога, операции корзины и выход. После выхода `/api/auth/me` должен возвращать `{ "user": null }`.

Браузер обращается к origin Shell; Vercel передаёт запросы на Railway. Поэтому backend может оставаться на Railway с текущими атрибутами cookie. Прямой cross-site fetch к Railway не передаёт cookie с `SameSite=Lax` даже с `credentials: "include"`.

Catalog и Cart, загруженные как remote внутри Shell, используют переданный `apiBaseUrl=/api`, а относительные запросы выполняются на origin страницы Shell. Их отдельные production-деплои и настройки не меняются. Самостоятельные страницы Catalog и Cart читают собственный `runtime-config.json`; их отдельная авторизация этой настройкой не обеспечивается.

`API_PROXY_TARGET` настраивает только dev/preview-сервер Vite. Для смены production backend на Vercel обновите destination в `vercel.json`. Для отката используйте предыдущий исправный deployment с соответствующими переменными сборки; возврат к прямому адресу Railway снова создаёт зависимость от cross-site cookie.

## Настройки загрузки микрофронтов

В config.ts каждый объект remotes.catalog и remotes.cart содержит name (имя регистрации), entry (URL), type (формат module) и moduleId (готовый идентификатор catalog/CatalogApp или cart/CartApp). Общий remoteLoadTimeoutMs задаёт ожидание загрузки в миллисекундах, по умолчанию 20 000.

Функция registerMicrofrontends в register-remotes.ts передаёт name, entry и type в registerRemotes. Вспомогательная createLazyMicrofrontend передаёт готовый moduleId в loadRemote без сборки строки и регулярных выражений. Таймаут ограничивает ожидание, но не отменяет сетевой запрос. Vite проверяет те же переменные URL до запуска или сборки; имена модулей не участвуют в этой проверке.
