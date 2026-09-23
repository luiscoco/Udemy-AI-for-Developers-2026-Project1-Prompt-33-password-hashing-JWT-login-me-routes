import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import type { UserRecord } from "../data/repository.js";
import { isLoginRequest, isRole, toPublicUser, tokenClaimsFor, verifyPassword } from "./auth.js";

const RECORD: UserRecord = {
  id: "user-1",
  email: "sam@equipment-hub.test",
  passwordHash: "$2b$04$not-a-real-hash",
  name: "Sam Supervisor",
  role: "supervisor",
  technicianId: null,
};

describe("verifyPassword", () => {
  it("accepts the matching password and rejects others", async () => {
    const hash = await bcrypt.hash("Super!2345", 4);

    expect(await verifyPassword("Super!2345", hash)).toBe(true);
    expect(await verifyPassword("super!2345", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });
});

describe("isRole", () => {
  it("accepts only the contract roles", () => {
    expect(isRole("technician")).toBe(true);
    expect(isRole("supervisor")).toBe(true);
    expect(isRole("admin")).toBe(true);
    expect(isRole("root")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("isLoginRequest", () => {
  it("requires non-empty string email and password", () => {
    expect(isLoginRequest({ email: "a@b.test", password: "x" })).toBe(true);
    expect(isLoginRequest({ email: "a@b.test" })).toBe(false);
    expect(isLoginRequest({ email: "", password: "x" })).toBe(false);
    expect(isLoginRequest({ email: "a@b.test", password: 123 })).toBe(false);
    expect(isLoginRequest(null)).toBe(false);
    expect(isLoginRequest("a@b.test")).toBe(false);
  });
});

describe("toPublicUser", () => {
  it("drops the password hash", () => {
    const user = toPublicUser(RECORD);

    expect(user).toEqual({
      id: "user-1",
      email: "sam@equipment-hub.test",
      name: "Sam Supervisor",
      role: "supervisor",
      technicianId: null,
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("throws on a role the contract does not know", () => {
    expect(() => toPublicUser({ ...RECORD, role: "root" })).toThrow(/unknown role/);
  });
});

describe("tokenClaimsFor", () => {
  it("maps the user to sub, role and technicianId", () => {
    expect(tokenClaimsFor({ ...toPublicUser(RECORD), role: "technician", technicianId: "tech-1" })).toEqual({
      sub: "user-1",
      role: "technician",
      technicianId: "tech-1",
    });
  });
});
