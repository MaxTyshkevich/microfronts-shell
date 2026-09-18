# Правила shell-репозитория

Это отдельный репозиторий shell-команды. Shell собирает итоговое приложение и подключает микрофронты по URL.

## Границы

- Shell знает адреса `catalog` и `cart`.
- Shell не импортирует исходники `catalog` и `cart`.
- Shell может иметь команду для запуска локального интеграционного стенда.
- Бизнес-логика каталога и корзины не должна появляться в shell.

## Команды

- `npm install` - установить зависимости shell.
- `npm run dev` - запустить только shell на `http://localhost:5173`.
- `npm run dev:all` - запустить shell, catalog и cart для локальной интеграции.
- `npm run typecheck` - проверить TypeScript.
- `npm run build` - собрать shell.

## Shared UI

Для независимого checkout `@microfronts/ui` поставляется готовым tarball в `vendor/`. Архив и package-lock.json должны храниться в Git. После обновления пакета обновлять версию и lock-файл. Пакет platform удалён из зависимостей: контракт описан в `src/remote-props.ts`, связь через props/callbacks. Репозитории не импортируют исходники друг друга.

Production build требует HTTPS-переменные из `.env.example`. Для локальной проверки сборки используется `npm run build:local`; общий стенд и E2E находятся в отдельном `integration`-репозитории.
