# @microfronts/shell

Практическое руководство: [карта файлов и план работы с Shell](docs/shell-guide.md).

Архитектура и правила FSD: [docs/architecture.md](docs/architecture.md). Процесс выполнения задач: [AGENTS.md](AGENTS.md).

Отдельный Git-репозиторий React 19 + Vite + Module Federation. Установка не требует соседних исходников: готовый UI находится в vendor. Связь микрофронтов — через props, навигационные callbacks и общий TanStack QueryClient; пакет platform не требуется. Контракт поставляется архивом @microfronts/contracts в vendor.

```powershell
npm ci
npm run dev
```

Открыть http://localhost:5173.
По умолчанию Shell ожидает Catalog на 5174, Cart на 5175 и backend на 3000.

Скопируйте .env.example в .env.local. API_PROXY_TARGET выбирает backend для локального /api proxy. Для публичной сборки задайте HTTPS-переменные из примера. Настройки читаются через import.meta.env и встраиваются при сборке.

Команды: npm run typecheck, npm run build (cloud), npm run build:local (localhost), npm run preview. Preview использует порт 4173. Общая сборка и тесты стенда находятся в отдельном integration-репозитории.

Shell загружает catalog/CatalogApp и cart/CartApp по URL; не импортирует исходники remote. Ошибки загрузки изолируются RemoteBoundary.

Shell владеет маршрутами /, /catalog, /cart, /login, /register, /account и передаёт apiBaseUrl, cartKey, sessionScope, QueryClient и callbacks через props. После мутаций remote инвалидирует общий ключ корзины. При смене сессии Shell отменяет запросы и заменяет QueryClient. Данные корзины и HTTP-запросы остаются внутри remote. Конфигурация читается только host; список remotes дочерним компонентам не передаётся.

Контракт props изменён: старые сборки с platform несовместимы с новыми. Выпускайте согласованный комплект shell/catalog/cart; для безопасной публикации сначала подготовьте отдельные URL новых remote, затем переключите новый shell на них. Откат должен восстанавливать весь комплект.

Для Render используйте render.yaml; для Docker Compose — Dockerfile и nginx.conf (он ожидает сервис backend:3000). vendor и package-lock.json коммитятся, node_modules/dist/.env — нет.

Текущий backend хранит пользователей, сессии и корзины в PostgreSQL. Разные origins имеют разные анонимные ключи корзины. Полная инструкция и отчёт — в integration/README.md и integration/IMPLEMENTATION_REPORT.md общего workspace.

Авторизация: HttpOnly cookie, формы React Hook Form, запросы TanStack Query. В production проксируйте /api на origin Shell к backend с сохранением Cookie/Set-Cookie; CORS_ORIGINS backend должен включать origin Shell. Nginx поддерживает прямые SPA-ссылки. Для другого хостинга настройте /api proxy перед SPA fallback.

Обновляйте backend, Shell и remote согласованным комплектом: новый backend требует X-Requested-With для мутаций, новые remote его отправляют. Новому Shell нужны remote с поддержкой sessionScope. Zustand пока не используется.

## Структура исходников

`src/main.tsx` запускает приложение; `src/app` содержит конфигурацию, providers, маршруты, layout, хедер, футер, модель выхода и интеграцию remote; `src/pages` — страницы home/auth/account; `src/entities/session` — модель и API сессии. Страницы получают host-данные через props и не импортируют `app`. Внешние импорты слайсов проходят через их `index.ts`.

Проверки: `npm run check:architecture`, `npm run typecheck`, `npm run build:local`. Проверка FSD-границ также включена в CI. Подробности: [архитектура](docs/architecture.md).

Публичные адреса API и remote задаются переменными Vite. Их изменение требует пересборки Shell. Подробности: [настройки](docs/runtime-config.md).

Отчёт о переходе на FSD: [FSD_REPORT.md](FSD_REPORT.md).

## Tailwind и владение CSS

Tailwind 4 и @tailwindcss/vite установлены как devDependencies: каждый репозиторий собирает свой CSS, в federation.shared они не входят. Поддерживаются Chrome 111+, Safari 16.4+ и Firefox 128+.

Файл src/app/styles/tailwind.css сканирует собственный src и index.html и использует префикс `shell:`: например, `shell:flex`, `shell:hover:bg-blue-600`. Записывайте классы целиком, не собирайте имена интерполяцией. Исходники соседей и UI-пакета не сканируются.

Shell импортирует @microfronts/ui/reset.css один раз через src/main.tsx и владеет глобальным reset интегрированной страницы.

UI-пакет 0.2.0-tailwind.0 из vendor автоматически поставляет готовые стили компонентов без Preflight и глобальных правил base. Его reset.css содержит Preflight и базовые правила темы. Во всех сборках порядок слоёв: theme, base, components, utilities. Префиксы не изолируют произвольный CSS: ручные правила ограничивайте корнем remote или CSS Modules. Оформление Shell задаётся классами shell: в JSX и index.html; global.css удалён.

Порядок выпуска: сначала Shell с явным reset, затем remote с CSS без reset. Архивы vendor и lock-файлы обновляются вместе; зависимости на соседние checkout не добавляются.

## Доступ и авторизация

/login и /register открыты без сессии, включая недоступный API. /catalog и /cart поддерживают гостей после проверки сессии. /account требует входа; адрес возврата сохраняется. Главная `/` — публичная приветственная страница с переходом в каталог, доступная даже при ошибке API. Layout содержит отдельные хедер и футер и не блокирует публичные страницы. Хедер показывает ожидание проверки сессии, затем ссылки входа/регистрации или аккаунт и выход. После успешного выхода открывается `/`.

И вход, и регистрация устанавливают HttpOnly cookie. После ответа {success: true} Shell получает пользователя и роль USER/ADMIN через /auth/me. Роль показана в аккаунте; административных страниц пока нет. При смене пользователя кеш заменяется.

В соседнем integration-репозитории `npm run test:auth` проверяет маршруты, cookie, роли и изоляцию корзин с контролируемым API, без запуска базы данных.

Настройки запроса сессии и `useSession` находятся в `entities/session/api/session-queries.ts`; `sessionQueries.current(api)` можно использовать для загрузки через QueryClient. Типы остаются в `model/session.ts`. Сценарий входа/регистрации вынесен в `pages/auth/model/use-authentication.ts`, выход — в `app/model/use-logout.ts`. UI вызывает готовые хуки; отмена старого запроса сессии и замена кеша при смене пользователя сохраняются.
