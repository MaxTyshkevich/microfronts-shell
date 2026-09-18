# Готовые внутренние пакеты

microfronts-ui-0.1.0.tgz — существующая сборка packages/ui, проверенная scripts/check-package.mjs.
Контракт микрофронтов теперь описан в src/remote-props.ts; пакет platform не используется.

Архивы созданы npm pack --ignore-scripts. Они должны храниться в Git, чтобы npm ci работал независимо от соседних checkout.
Целостность фиксирует package-lock.json. При изменениях выпускайте новую версию и обновляйте dependency/lock.
