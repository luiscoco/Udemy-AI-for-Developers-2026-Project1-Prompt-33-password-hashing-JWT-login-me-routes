import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LoginResponse, User } from "@equipment-hub/contract";
import { createApp } from "../app.js";
import type { Repository, UserRecord } from "../data/repository.js";

const JWT_SECRET = "test-secret";
const PASSWORD = "Tech!2345";

let USERS: UserRecord[];

beforeAll(async () => {
  // Low cost factor keeps the suite fast; the hash format is the same as production.
  const passwordHash = await bcrypt.hash(PASSWORD, 4);

  USERS = [
    {
      id: "user-1",
      email: "elena.vasquez@equipment-hub.test",
      passwordHash,
      name: "Elena Vasquez",
      role: "technician",
      technicianId: "tech-1",
    },
    {
      id: "user-2",
      email: "admin@equipment-hub.test",
      passwordHash,
      name: "Ana Admin",
      role: "admin",
      technicianId: null,
    },
  ];
});

function createFixtureRepository(): Repository {
  return {
    listAssets: () => [],
    listTechnicians: () => [],
    listWorkOrders: () => [],
    getWorkOrder: () => undefined,
    saveWorkOrder: () => {},
    assetExists: () => false,
    technicianExists: () => false,
    references: () => [],
    findUserByEmail: (email) => USERS.find((user) => user.email === email),
    findUserById: (id) => USERS.find((user) => user.id === id),
  };
}

describe("auth routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(createFixtureRepository(), { jwtSecret: JWT_SECRET });
  });

  async function login(email: string, password: string) {
    return await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
  }

  describe("POST /api/auth/login", () => {
    it("returns a token and the public user for valid credentials", async () => {
      const response = await login("elena.vasquez@equipment-hub.test", PASSWORD);

      expect(response.statusCode).toBe(200);

      const body = response.json<LoginResponse>();
      const expectedUser: User = {
        id: "user-1",
        email: "elena.vasquez@equipment-hub.test",
        name: "Elena Vasquez",
        role: "technician",
        technicianId: "tech-1",
      };

      expect(body.user).toEqual(expectedUser);
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(response.body).not.toContain("passwordHash");
      expect(app.jwt.verify(body.token)).toMatchObject({ sub: "user-1", role: "technician", technicianId: "tech-1" });
    });

    it("carries a null technicianId in the token for non-technician users", async () => {
      const response = await login("admin@equipment-hub.test", PASSWORD);

      expect(response.statusCode).toBe(200);
      expect(app.jwt.verify(response.json<LoginResponse>().token)).toMatchObject({
        sub: "user-2",
        role: "admin",
        technicianId: null,
      });
    });

    it("returns 401 with an ApiError body for a wrong password", async () => {
      const response = await login("elena.vasquez@equipment-hub.test", "not-the-password");

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ message: "Invalid email or password" });
    });

    it("returns 401 with the same ApiError body for an unknown email", async () => {
      const response = await login("nobody@equipment-hub.test", PASSWORD);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ message: "Invalid email or password" });
    });

    it("returns 400 when email or password is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "elena.vasquez@equipment-hub.test" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ message: "email and password are required" });
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the current user for a valid token", async () => {
      const { token } = (await login("elena.vasquez@equipment-hub.test", PASSWORD)).json<LoginResponse>();

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: "user-1",
        email: "elena.vasquez@equipment-hub.test",
        name: "Elena Vasquez",
        role: "technician",
        technicianId: "tech-1",
      });
    });

    it("returns 401 when no token is sent", async () => {
      const response = await app.inject({ method: "GET", url: "/api/auth/me" });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ message: "Missing or invalid bearer token" });
    });

    it("returns 401 for a malformed token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: "Bearer not-a-jwt" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ message: "Missing or invalid bearer token" });
    });

    it("returns 401 for a token signed with a different secret", async () => {
      const otherApp = createApp(createFixtureRepository(), { jwtSecret: "some-other-secret" });
      const { token } = (
        await otherApp.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { email: "elena.vasquez@equipment-hub.test", password: PASSWORD },
        })
      ).json<LoginResponse>();

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ message: "Missing or invalid bearer token" });
    });

    it("returns 401 when the token's user no longer exists", async () => {
      await app.ready();
      const token = app.jwt.sign({ sub: "deleted-user", role: "technician", technicianId: null });

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
