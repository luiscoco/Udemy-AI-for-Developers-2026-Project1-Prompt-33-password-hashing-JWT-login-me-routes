import bcrypt from "bcryptjs";
import type { LoginRequest, Role, User } from "@equipment-hub/contract";
import { ROLES } from "@equipment-hub/contract";
import type { UserRecord } from "../data/repository.js";

/** Claims carried inside every access token issued by POST /api/auth/login. */
export interface TokenClaims {
  sub: string;
  role: Role;
  technicianId: string | null;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export function isLoginRequest(body: unknown): body is LoginRequest {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const { email, password } = body as Record<string, unknown>;

  return typeof email === "string" && email.length > 0 && typeof password === "string" && password.length > 0;
}

/** Strips credentials from a stored user; throws if the stored role is not a known role. */
export function toPublicUser(record: UserRecord): User {
  if (!isRole(record.role)) {
    throw new Error(`User "${record.id}" has unknown role "${record.role}"`);
  }

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    technicianId: record.technicianId,
  };
}

export function tokenClaimsFor(user: User): TokenClaims {
  return { sub: user.id, role: user.role, technicianId: user.technicianId };
}
