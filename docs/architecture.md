# Архитектура Shell

Практическое руководство: [карта файлов и план работы с Shell](shell-guide.md).

Shell собирает приложение, управляет навигацией и сессией и подключает `catalog/CatalogApp` и `cart/CartApp` по URL. Бизнес-логика каталога и корзины остаётся в remote. Исходники соседних репозиториев не импортируются.

## FSD

Используются только необходимые слои Feature-Sliced Design: `app → pages → entities`. Слои `features`, `widgets` и `shared` пока не нужны; `processes` не используется.

```text
src/
  main.tsx                         React root и отображение App
  app/
    entrypoint/app.tsx      Сборка providers, router и remote
    config/config.ts       Настройки из import.meta.env
    providers/                     Общий и закрытый QueryClientProvider
    routes/                        Дерево маршрутов, guards и интеграция страниц
    integrations/remotes/          Регистрация, lazy-загрузка и boundary
    lib/query-client.ts             Общие настройки QueryClient
    ui/                           ShellLayout, ShellHeader и ShellFooter
    model/use-logout.ts            Выход и переход на главную
  pages/
    home/                          Публичная приветственная страница
    auth/                          Форма, модель входа/регистрации и безопасный returnTo
    account/                       Представление аккаунта
  entities/
    session/                       Session, UserRole, cookie API и useSession
```

`app` разделён непосредственно на сегменты. В `pages` и `entities` сначала идёт предметный слайс, затем сегменты `ui`, `api`, `model`, `lib`. Каждый слайс предоставляет публичный `index.ts`.

Импорты между слоями направлены вниз; слайсы одного слоя изолированы. Внешний код обращается к слайсу через его `index.ts`. Внутренние импорты слайса разрешены. Исключения `@x` не используются. `main.tsx` — единственный файл запуска вне слоёв; локальные импорты из него ведут в `app`.

Страницы не знают о HostProvider, конфигурации окружения и реестре remote. Маршруты в `app/routes` получают сессию из TanStack Query и передают страницам данные через props; внутренние данные закрытых маршрутов передаются через Outlet context. Компоненты маршрутов объявлены на уровне модуля router.tsx; router создаётся один раз при загрузке модуля App.

Вход и регистрация используют одну страницу с двумя режимами. Их непереиспользуемая логика остаётся в `pages/auth`: Zod-схема полей находится в `model/auth-schema.ts`, мутация входа/регистрации — в `model/use-authentication.ts`. UI подключает схему через React Hook Form и отображает состояние. Выход выполняет `app/model/use-logout.ts`, после успеха открывается `/`. Хедер и футер — отдельные компоненты `app/ui`, собранные в layout; сессия загружается через useSession из entities/session. Layout всегда отображает Outlet. Отдельные features следует выделять при появлении переиспользуемого сценария, а не для заполнения слоёв.

`npm run check:architecture` проверяет структуру, направление зависимостей, изоляцию слайсов, публичные API и запрет локальных импортов за пределами `src`. Проверяются import/export, import types, строковые dynamic import и require с разрешением модулей TypeScript. Вычисляемые импорты запрещены, поскольку их границы невозможно проверить статически. Проверка включена в CI.

## Доступ к маршрутам

- /, /login и /register предназначены для гостей. Подтверждённый пользователь переходит на безопасный returnTo или /catalog.
- Главная и формы доступны во время загрузки /auth/me и при отказе API. Ошибка сети не считается подтверждением гостя.
- /catalog (Products), /cart и /account требуют подтверждённого пользователя. До ответа /auth/me показывается ожидание, при ошибке — повторная проверка.
- Гость на закрытом маршруте переходит на /login с сохранением pathname, query и hash. После входа/регистрации открывается этот адрес, по умолчанию /catalog.
- returnTo допускает только /catalog, /cart и /account; внешний URL, главная и формы заменяются на /catalog.
- Меню гостя содержит главную, вход и регистрацию. Меню пользователя — каталог, корзину, аккаунт и выход. После успешного выхода открывается /.
- Страница 404 доступна всем.

## Сессия и кеш

Авторизация использует HttpOnly cookie. Login/register устанавливают cookie и возвращают {success: true}; затем Shell запрашивает /auth/me для подтверждения пользователя. Logout возвращает подтверждение. JavaScript не читает токен. Гостевая корзина в Shell отсутствует: ключи в localStorage не создаются, при входе X-Cart-Key не отправляется.

Единственный источник пользователя — кеш TanStack Query. `entities/session/api/session-api.ts` содержит HTTP-функции, `session-queries.ts` — queryOptions и useSession, `session-mutations.ts` — mutationOptions и обновление кеша. Перед входом/выходом и перед применением успешного результата отменяются старые запросы /me. При ошибке мутации проверка сессии возобновляется.

`HostProvider` только создаёт общий QueryClient и подключает QueryClientProvider. Host-контекста, HostState, identity, generation и onSession нет. Несколько потребителей useSession используют один ключ и общий запрос. Сценарий входа в pages/auth/model добавляет навигацию к настройкам мутации; сценарий выхода в app/model переводит на главную. DOM RouterProvider поддерживает синхронный переход после выхода, чтобы redirect закрытого маршрута не опередил его.

`RequireAuth` получает пользователя из общего клиента и открывает `AuthenticatedQueryProvider` с React key по user.id. Этот внутренний клиент принадлежит закрытой части приложения. При выходе, ошибке/сбросе сессии или смене пользователя дерево размонтируется, запросы отменяются и кеш очищается. Старые ответы и мутации привязаны к прежнему клиенту. Навигация между закрытыми страницами сохраняет текущий клиент.

Пользователь и callback повторной проверки передаются дочерним маршрутам через Outlet context. Страницы и remote не запускают отдельную проверку /me. При onUnauthorized от remote RequireAuth сбрасывает запрос сессии общего клиента: закрытые данные скрываются до нового подтверждения. Отсутствие пользователя приводит на login, ошибка API показывает повторную проверку.

SessionUser расширяет User из contracts полем role: USER или ADMIN. Неизвестная роль в /me считается ошибкой. Обе существующие роли могут открывать закрытые страницы; административные маршруты не добавлены. Сервер самостоятельно проверяет доступ к данным.

## Контракт remote

Shell монтирует catalog по `/catalog/*`: список `/catalog` и товар `/catalog/products/:productId` определяются внутри remote. Категория списка хранится в query string. `react-router` 7.18.4 разделяется как singleton через Module Federation: Shell предоставляет общий router, catalog использует его контекст и не создаёт вложенный BrowserRouter. Формат CatalogProps прежний; для нового catalog требуется обновлённый Shell. После входа safeReturnTo допускает конкретный путь товара с query/hash, сохраняя прежние проверки origin и остальных разрешённых страниц. Прямые ссылки требуют SPA fallback на host.

Выпуск: сначала backend с миграцией категорий и API товара по ID, затем согласованное обновление Shell и catalog. Проверки Shell используют подмену remote; они не заменяют проверку настоящей Module Federation и общего контекста router.

React 19, TypeScript, Vite, Module Federation и TanStack Query. UI и типы интеграции поставляются tarball-пакетами `@microfronts/ui` и `@microfronts/contracts` из `vendor`. Их исходники в Shell не копируются.

Remote получают `apiBaseUrl`, `cartKey`, `queryClient`, `sessionScope`, `onUnauthorized` и `onNavigate`. Контракт пакета не меняется. Shell передаёт `sessionScope: user:<id>` и пустой `cartKey`: для подтверждённого пользователя backend игнорирует гостевой ключ. Параметры совместимости формируются только в RemoteRoute. Типы props импортируются непосредственно из `@microfronts/contracts`. Реестр URL остаётся только внутри Shell. Контракт props и имена exposed modules сохраняются.

Загрузка remote ограничена таймаутом 20 секунд. Suspense показывает загрузку, RemoteBoundary изолирует ошибку одного модуля; другая страница и навигация остаются доступны. Boundary перемонтируется при смене области сессии или имени remote.

## Конфигурация и инфраструктура

Подробное объяснение: [runtime-config.md](runtime-config.md). Переменные перечислены в [.env.example](../.env.example).

Vite проверяет URL при запуске и сборке. Адреса из import.meta.env встраиваются в JavaScript; отдельный JSON не нужен. Для изменения адресов готовой сборки требуется пересборка.

Production build требует HTTPS-адреса remote. API может использовать `/api` на origin Shell. Reverse proxy должен сохранять Cookie/Set-Cookie; SPA fallback должен поддерживать прямые ссылки. В браузерный конфиг нельзя помещать секреты.

## Проверки

В Shell: `npm run check:architecture`, `npm run typecheck`, `npm run build:local`, `npm run test:auth`. CI также выполняет production build с HTTPS-настройками.

Тесты формы лежат в pages/auth/ui/auth-page.pw.spec.ts, проверки маршрутов и сессии — в app/routes/router.pw.spec.ts. Playwright подменяет auth API и адаптер federation, сохраняя реальные guards и QueryClient. Проверяются гостевые/закрытые маршруты, returnTo, вход/регистрация, выход, ожидание и ошибка /me, смена аккаунта, потеря сессии и запоздалые ответы. Backend, база данных и соседние исходники для этих тестов не нужны.

Настоящая загрузка federation и серверные cookie проверяются отдельно в общем интеграционном стенде. Моки Shell не заменяют такую проверку. Изменения этой задачи не меняют HTTP API и контракт remote; существующие remote совместимы.

## Tailwind и владение CSS

Tailwind 4 и @tailwindcss/vite установлены как devDependencies: каждый репозиторий собирает свой CSS, в federation.shared они не входят. Поддерживаются Chrome 111+, Safari 16.4+ и Firefox 128+.

Файл src/app/styles/page-reset.css подключает reset UI-пакета и импортируется только из main.tsx. Файл src/app/styles/tailwind.css сканирует собственный src и index.html и использует префикс `shell:`: например, `shell:flex`, `shell:hover:bg-blue-600`. Записывайте классы целиком, не собирайте имена интерполяцией. Исходники соседей и UI-пакета не сканируются.

Shell импортирует @microfronts/ui/reset.css один раз через src/main.tsx и владеет глобальным reset интегрированной страницы.

UI-пакет 0.2.0-tailwind.0 из vendor автоматически поставляет готовые стили компонентов без Preflight и глобальных правил base. Его reset.css содержит Preflight и базовые правила темы. Во всех сборках порядок слоёв: theme, base, components, utilities. Префиксы не изолируют произвольный CSS: ручные правила ограничивайте корнем remote или CSS Modules. Оформление Shell задаётся классами shell: в JSX и index.html; global.css удалён.

Порядок выпуска: сначала Shell с явным reset, затем remote с CSS без reset. Архивы vendor и lock-файлы обновляются вместе; зависимости на соседние checkout не добавляются.

CSS-импорты в TypeScript описываются клиентскими типами Vite: tsconfig.json подключает vite/client и node. Reset остаётся глобальным CSS; классы Tailwind используются для оформления элементов.
