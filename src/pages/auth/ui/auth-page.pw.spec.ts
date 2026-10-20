import { expect, test, type Page } from "@playwright/test";

type Submission = {
  path: string;
  body: { email: string; password: string; name?: string };
};

async function mockAuthApi(page: Page) {
  const submissions: Submission[] = [];
  let user: { id: string; email: string; name: string; role: "USER" } | null = null;

  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      await route.fulfill({ json: { user } });
      return;
    }
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      const body = route.request().postDataJSON() as Submission["body"];
      submissions.push({ path, body });
      user = {
        id: "test-user",
        email: body.email,
        name: body.name ?? "Тестовый пользователь",
        role: "USER",
      };
      await route.fulfill({ json: { success: true } });
      return;
    }
    await route.fulfill({ status: 404, json: { message: "Unexpected auth request" } });
  });

  return submissions;
}

test("вход показывает ошибки полей и не отправляет неверные данные", async ({ page }) => {
  const submissions = await mockAuthApi(page);
  await page.goto("/login");

  await page.getByRole("textbox", { name: "Email" }).fill("не-email");
  await page.getByLabel("Пароль").fill("ab");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByText("Укажите корректный email")).toBeVisible();
  await expect(page.getByText("Минимум 3 символа")).toBeVisible();
  expect(submissions).toHaveLength(0);
});

test("регистрация показывает ошибки имени и подтверждения", async ({ page }) => {
  const submissions = await mockAuthApi(page);
  await page.goto("/register");

  await page.getByRole("textbox", { name: "Имя" }).fill("Al");
  await page.getByRole("textbox", { name: "Email" }).fill("user@example.com");
  await page.getByLabel("Пароль", { exact: true }).fill("abc");
  await page.getByLabel("Повторите пароль").fill("other");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();

  await expect(page.getByText("Имя должно содержать от 3 до 20 символов")).toBeVisible();
  await expect(page.getByText("Пароли не совпадают")).toBeVisible();
  expect(submissions).toHaveLength(0);
});

test("вход отправляет форму и открывает адрес возврата", async ({ page }) => {
  const submissions = await mockAuthApi(page);
  await page.goto("/login?returnTo=%2Faccount");

  await page.getByRole("textbox", { name: "Email" }).fill("user@example.com");
  await page.getByLabel("Пароль").fill("abc");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Тестовый пользователь")).toBeVisible();
  expect(submissions).toEqual([
    { path: "/api/auth/login", body: { email: "user@example.com", password: "abc" } },
  ]);
});

test("регистрация отправляет проверенные данные и открывает аккаунт", async ({ page }) => {
  const submissions = await mockAuthApi(page);
  await page.goto("/register");

  await page.getByRole("textbox", { name: "Имя" }).fill("  Alice  ");
  await page.getByRole("textbox", { name: "Email" }).fill("alice@example.com");
  await page.getByLabel("Пароль", { exact: true }).fill("abc");
  await page.getByLabel("Повторите пароль").fill("abc");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Alice", { exact: true })).toBeVisible();
  expect(submissions).toEqual([
    {
      path: "/api/auth/register",
      body: { email: "alice@example.com", password: "abc", name: "Alice" },
    },
  ]);
});
