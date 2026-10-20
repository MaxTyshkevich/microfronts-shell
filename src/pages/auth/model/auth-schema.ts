import { z } from "zod";

export type AuthMode = "login" | "register";

const fieldsSchema = z.object({
  name: z.string().trim(),
  email: z.string().trim().min(1, "Введите email").pipe(z.email("Укажите корректный email")),
  password: z.string().min(1, "Введите пароль").min(3, "Минимум 3 символа").max(128, "Максимум 128 символов"),
  confirmation: z.string(),
});

export type AuthFields = z.infer<typeof fieldsSchema>;

export function createAuthSchema(mode: AuthMode) {
  return fieldsSchema.superRefine((fields, context) => {
    if (mode !== "register") return;

    if (fields.name.length < 3 || fields.name.length > 20) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: fields.name ? "Имя должно содержать от 3 до 20 символов" : "Введите имя",
      });
    }
    if (fields.confirmation !== fields.password) {
      context.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Пароли не совпадают",
      });
    }
  });
}
