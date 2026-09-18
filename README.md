# @microfronts/shell

Отдельный Git-репозиторий React 19 + Vite + Module Federation. Установка не требует соседних исходников: готовый UI находится в vendor. Связь микрофронтов — через props, навигационные callbacks и общий TanStack QueryClient; пакет platform не требуется. Контракт поставляется архивом @microfronts/contracts в vendor.

```powershell
npm ci
npm run dev
```

Открыть http://localhost:5173.
По умолчанию Shell ожидает Catalog на 5174, Cart на 5175 и backend на 3000.

Скопируйте .env.example в .env.local. API_PROXY_TARGET выбирает backend для локального /api proxy. Для публичной сборки задайте HTTPS-переменные из примера. Настройки передаются через runtime-config.json.

Команды: npm run typecheck, npm run build (cloud), npm run build:local (localhost), npm run preview. Preview использует порт 4173. Общая сборка и тесты стенда находятся в отдельном integration-репозитории.

Shell загружает catalog/CatalogApp и cart/CartApp по URL; не импортирует исходники remote. Ошибки загрузки изолируются RemoteBoundary.

Shell владеет маршрутами /catalog, /cart, /login, /register, /account и передаёт apiBaseUrl, cartKey, sessionScope, QueryClient и callbacks через props. После мутаций remote инвалидирует общий ключ корзины. При смене сессии Shell отменяет запросы и заменяет QueryClient. Данные корзины и HTTP-запросы остаются внутри remote. runtime-config.json читается только host; список remotes дочерним компонентам не передаётся.

Контракт props изменён: старые сборки с platform несовместимы с новыми. Выпускайте согласованный комплект shell/catalog/cart; для безопасной публикации сначала подготовьте отдельные URL новых remote, затем переключите новый shell на них. Откат должен восстанавливать весь комплект.

Для Render используйте render.yaml; для Docker Compose — Dockerfile и nginx.conf (он ожидает сервис backend:3000). vendor и package-lock.json коммитятся, node_modules/dist/.env — нет.

Текущий backend хранит пользователей, сессии и корзины в SQLite. Разные origins имеют разные анонимные ключи корзины. Полная инструкция и отчёт — в integration/README.md и integration/IMPLEMENTATION_REPORT.md общего workspace.

Авторизация: HttpOnly cookie, формы React Hook Form, запросы TanStack Query. В production проксируйте /api на origin Shell к backend с сохранением Cookie/Set-Cookie; CORS_ORIGINS backend должен включать origin Shell. Nginx поддерживает прямые SPA-ссылки. Для другого хостинга настройте /api proxy перед SPA fallback.

Обновляйте backend, Shell и remote согласованным комплектом: новый backend требует X-Requested-With для мутаций, новые remote его отправляют. Новому Shell нужны remote с поддержкой sessionScope. Zustand пока не используется.
