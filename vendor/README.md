# Готовые внутренние пакеты

microfronts-ui-0.1.0.tgz — существующая сборка packages/ui, проверенная scripts/check-package.mjs.
microfronts-platform-0.1.0.tgz — контракт и браузерный adapter из packages/platform.

Архивы созданы npm pack --ignore-scripts. Они должны храниться в Git, чтобы npm ci работал независимо от соседних checkout.
Целостность фиксирует package-lock.json. При изменениях выпускайте новую версию и обновляйте dependency/lock.
