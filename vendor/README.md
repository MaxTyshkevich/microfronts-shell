# Готовые внутренние пакеты

microfronts-ui-0.2.0-tailwind.0.tgz — существующая сборка packages/ui, проверенная scripts/check-package.mjs.
Контракт микрофронтов теперь описан в src/remote-props.ts; пакет platform не используется.

Архивы созданы npm pack --ignore-scripts. Они должны храниться в Git, чтобы npm ci работал независимо от соседних checkout.
Целостность фиксирует package-lock.json. При изменениях выпускайте новую версию и обновляйте dependency/lock.

UI microfronts-ui-0.2.0-tailwind.0.tgz автоматически подключает стили компонентов без reset. Явный импорт @microfronts/ui/reset.css принадлежит владельцу страницы (Shell или standalone main.tsx). Архив собран из packages/ui; исходники соседнего checkout не требуются для установки.
