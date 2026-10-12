import type { User } from "@microfronts/contracts";

export type UserRole = "USER" | "ADMIN";
export interface SessionUser extends User {
  role: UserRole;
}
export interface Session {
  user: SessionUser | null;
}
