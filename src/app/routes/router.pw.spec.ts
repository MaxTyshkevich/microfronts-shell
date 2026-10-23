import { expect, test, type Page } from "@playwright/test";

type User = { id: string; email: string; name: string; role: "USER" | "ADMIN" };
const alice: User = { id: "alice", email: "alice@example.com", name: "Alice", role: "USER" };
const bob: User = { id: "bob", email: "bob@example.com", name: "Bob", role: "ADMIN" };

async function mockApi(page: Page, user: User | null = null) {
  const state = { user, failMe: false, failLogout: false, meRequests: 0 };
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) {
      state.meRequests++;
      await route.fulfill(state.failMe
        ? { status: 503, json: { message: "API недоступен" } }
        : { json: { user: state.user } });
    } else if (path.endsWith("/logout")) {
      if (state.failLogout) {
        await route.fulfill({ status: 503, json: { message: "Выход не выполнен" } });
      } else {
        state.user = null;
        await route.fulfill({ json: { success: true } });
      }
    } else {
      expect(route.request().headers()["x-cart-key"]).toBeUndefined();
      const fields = route.request().postDataJSON() as { email: string };
      state.user = fields.email === bob.email ? bob : alice;
      await route.fulfill({ json: { success: true } });
    }
  });
  await page.route("**/api/cart", async (route) => {
    const expected = route.request().headers()["x-session-user"];
    if (!state.user || expected !== state.user.id) {
      await route.fulfill({ status: 401, json: { message: "Сессия изменилась" } });
    } else {
      expect(route.request().headers()["x-cart-key"]).toBe("");
      await route.fulfill({ json: { owner: state.user.email } });
    }
  });
  return state;
}

// Replace federation, keeping the real guards, auth API and supplied QueryClient.
async function mockRemotes(page: Page) {
  await page.route("**/src/app/integrations/remotes/register-remotes.ts", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const reactUrl = source.match(/import\s*\{\s*lazy\s*\}\s*from\s*["']([^"']+)["']/)?.[1];
    if (!reactUrl) throw new Error("React import missing in transformed remote adapter");
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        import { createElement, useEffect, useState } from ${JSON.stringify(reactUrl)};
        function remote(name) {
          return function Remote(props) {
            const [data, setData] = useState(null);
            const key = ["cart", props.apiBaseUrl, props.sessionScope];
            async function request(path, options = {}) {
              const response = await fetch(props.apiBaseUrl + path, {
                ...options, credentials: "include",
                headers: {
                  "X-Cart-Key": props.cartKey,
                  "X-Session-User": props.sessionScope.slice(5),
                  "X-Requested-With": "microfronts"
                }
              });
              if (response.status === 401 || response.status === 410) props.onUnauthorized();
              if (!response.ok) throw new Error("HTTP " + response.status);
              return response.json();
            }
            function load() {
              return props.queryClient.fetchQuery({
                queryKey: key, queryFn: () => request("/cart"), staleTime: 0, retry: false
              }).catch(() => {});
            }
            useEffect(() => {
              if (name !== "cart") return;
              const update = () => setData(props.queryClient.getQueryData(key) ?? null);
              const unsubscribe = props.queryClient.getQueryCache().subscribe(update);
              update();
              void load();
              return unsubscribe;
            }, [props.queryClient, props.sessionScope]);
            return createElement("section", { "aria-label": "Тестовый " + name },
              createElement("p", null, "Remote " + name),
              createElement("p", null, data ? "Корзина: " + data.owner : ""),
              createElement("button", { onClick: load }, "Обновить корзину"),
              createElement("button", {
                onClick: () => request("/cart/items", { method: "POST" }).then(
                  result => props.queryClient.setQueryData(key, result)
                ).catch(() => {})
              }, "Изменить корзину"),
              createElement("button", { onClick: () => props.onNavigate("cart") }, "Открыть корзину")
            );
          };
        }
        export function registerMicrofrontends() {
          return { CatalogApp: remote("catalog"), CartApp: remote("cart") };
        }
      `,
    });
  });
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("main").waitFor();
}

async function login(page: Page, email = alice.email) {
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("valid password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
}

for (const path of ["/catalog", "/cart", "/account"]) {
  test("гость не открывает " + path + " и сохраняет адрес возврата", async ({ page }) => {
    await mockApi(page);
    await mockRemotes(page);
    await open(page, path + "?source=link#content");
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe(path + "?source=link#content");
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Каталог", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Корзина", exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Remote /)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("microfronts.demo-cart.v1"))).toBeNull();
  });
}

for (const path of ["/", "/login", "/register"]) {
  test("авторизованный пользователь переходит с " + path + " в каталог", async ({ page }) => {
    await mockApi(page, alice);
    await mockRemotes(page);
    await open(page, path);
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByText("Remote catalog", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Вход", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Главная", exact: true })).toHaveCount(0);
  });
}

test("гость видит главную и только гостевую навигацию", async ({ page }) => {
  await mockApi(page);
  await open(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Главная", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Вход", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Регистрация", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Каталог", exact: true })).toHaveCount(0);
});

test("вход открывает каталог, переходы не повторяют /me, выход открывает главную", async ({ page }) => {
  const state = await mockApi(page);
  await mockRemotes(page);
  await open(page, "/login");
  await login(page);
  await expect(page).toHaveURL(/\/catalog$/);
  await page.getByRole("button", { name: "Открыть корзину" }).click();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
  const meRequests = state.meRequests;
  await page.getByRole("link", { name: "Каталог", exact: true }).click();
  await page.getByRole("button", { name: "Открыть корзину" }).click();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
  expect(state.meRequests).toBe(meRequests);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toHaveCount(0);
});

for (const returnTo of ["/", "https://evil.example/", "/login", "//evil.example/"]) {
  test("неподходящий returnTo ведёт в каталог: " + returnTo, async ({ page }) => {
    await mockApi(page);
    await mockRemotes(page);
    await open(page, "/login?returnTo=" + encodeURIComponent(returnTo));
    await login(page);
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByText("Remote catalog", { exact: true })).toBeVisible();
  });
}

test("ошибка проверки сессии закрывает страницу и даёт повторить запрос", async ({ page }) => {
  const state = await mockApi(page, alice);
  await mockRemotes(page);
  state.failMe = true;
  await open(page, "/cart");
  await expect(page.getByRole("alert")).toContainText("Не удалось проверить сессию");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("Remote cart", { exact: true })).toHaveCount(0);
  state.failMe = false;
  await page.getByRole("button", { name: "Повторить проверку" }).click();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
});

test("ошибка проверки сессии не блокирует форму входа", async ({ page }) => {
  const state = await mockApi(page);
  state.failMe = true;
  await open(page, "/login");
  await page.getByRole("textbox", { name: "Email" }).fill(alice.email);
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(alice.email);
});

test("потеря сессии в remote возвращает на login и позволяет сменить пользователя", async ({ page }) => {
  const state = await mockApi(page, alice);
  await mockRemotes(page);
  await open(page, "/cart");
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
  state.user = null;
  await page.getByRole("button", { name: "Обновить корзину" }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcart$/);
  await login(page, bob.email);
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("Корзина: " + bob.email, { exact: true })).toBeVisible();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Мой аккаунт" }).click();
  await expect(page.getByText("Роль: Администратор", { exact: true })).toBeVisible();
});

test("смена аккаунта в другой вкладке заменяет данные после перепроверки", async ({ page }) => {
  const state = await mockApi(page, alice);
  await mockRemotes(page);
  await open(page, "/cart");
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
  state.user = bob;
  await page.getByRole("button", { name: "Обновить корзину" }).click();
  await expect(page.getByText("Корзина: " + bob.email, { exact: true })).toBeVisible();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toHaveCount(0);
});

test("запоздалая мутация предыдущего пользователя не меняет новую корзину", async ({ page }) => {
  await mockApi(page, alice);
  await mockRemotes(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const mutationStarted = new Promise<void>((resolve) => { started = resolve; });
  let finished!: () => void;
  const mutationFinished = new Promise<void>((resolve) => { finished = resolve; });
  await page.route("**/api/cart/items", async (route) => {
    started();
    await pending;
    await route.fulfill({ json: { owner: "запоздалый ответ Alice" } });
    finished();
  });
  await open(page, "/cart");
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Изменить корзину" }).click();
  await mutationStarted;
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Вход", exact: true }).click();
  await login(page, bob.email);
  await expect(page).toHaveURL(/\/catalog$/);
  await page.getByRole("button", { name: "Открыть корзину" }).click();
  await expect(page.getByText("Корзина: " + bob.email, { exact: true })).toBeVisible();
  release();
  await mutationFinished;
  await page.getByRole("link", { name: "Каталог", exact: true }).click();
  await page.getByRole("button", { name: "Открыть корзину" }).click();
  await expect(page.getByText("Корзина: " + bob.email, { exact: true })).toBeVisible();
  await expect(page.getByText(/запоздалый ответ Alice/)).toHaveCount(0);
});

test("ошибка выхода не переводит пользователя в гостевой режим", async ({ page }) => {
  const state = await mockApi(page, alice);
  state.failLogout = true;
  await mockRemotes(page);
  await open(page, "/cart");
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Выход не выполнен");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("link", { name: "Мой аккаунт" })).toBeVisible();
});

test("пока /me не завершён, закрытый маршрут не показывает remote", async ({ page }) => {
  await mockApi(page, alice);
  await mockRemotes(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/auth/me", async (route) => {
    await pending;
    await route.fulfill({ json: { user: alice } });
  });
  await open(page, "/cart");
  await expect(page.getByRole("main")).toContainText("Проверяем сессию");
  await expect(page.getByText("Remote cart", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/cart$/);
  release();
  await expect(page.getByText("Корзина: " + alice.email, { exact: true })).toBeVisible();
});

test("запоздалый анонимный /me не отменяет успешный вход", async ({ page }) => {
  await mockApi(page);
  await mockRemotes(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  let finished!: () => void;
  const finishedResponse = new Promise<void>((resolve) => { finished = resolve; });
  await page.route("**/api/auth/me", async (route) => {
    if (!first) return route.fallback();
    first = false;
    await pending;
    await route.fulfill({ json: { user: null } });
    finished();
  });
  await open(page, "/login");
  await login(page);
  await expect(page).toHaveURL(/\/catalog$/);
  release();
  await finishedResponse;
  await page.getByRole("link", { name: "Мой аккаунт" }).click();
  await expect(page.getByText(alice.email, { exact: true })).toBeVisible();
});

test("регистрация без returnTo открывает каталог", async ({ page }) => {
  await mockApi(page);
  await mockRemotes(page);
  await open(page, "/register");
  await page.getByRole("textbox", { name: "Имя" }).fill(alice.name);
  await page.getByRole("textbox", { name: "Email" }).fill(alice.email);
  await page.getByLabel("Пароль", { exact: true }).fill("valid password");
  await page.getByLabel("Повторите пароль").fill("valid password");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByText("Remote catalog", { exact: true })).toBeVisible();
});

test("ошибка входа сохраняет форму и позволяет повторить вход", async ({ page }) => {
  await mockApi(page);
  await mockRemotes(page);
  let reject = true;
  await page.route("**/api/auth/login", async (route) => {
    if (!reject) return route.fallback();
    await route.fulfill({ status: 401, json: { message: "Неверный email или пароль" } });
  });
  await open(page, "/login");
  await login(page);
  await expect(page.getByRole("alert")).toContainText("Неверный email или пароль");
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(alice.email);
  reject = false;
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
});
