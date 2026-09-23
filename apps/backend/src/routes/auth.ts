import type { FastifyInstance } from "fastify";
import type { ApiError, LoginResponse } from "@equipment-hub/contract";
import type { Repository } from "../data/repository.js";
import { isLoginRequest, toPublicUser, tokenClaimsFor, verifyPassword } from "../domain/auth.js";

function errorBody(message: string): ApiError {
  return { message };
}

const INVALID_CREDENTIALS = "Invalid email or password";

export function registerAuthRoutes(app: FastifyInstance, repository: Repository): void {
  app.post("/api/auth/login", async (request, reply) => {
    if (!isLoginRequest(request.body)) {
      return reply.status(400).send(errorBody("email and password are required"));
    }

    const { email, password } = request.body;
    const record = await repository.findUserByEmail(email);

    // Same response for unknown email and wrong password, so the endpoint
    // does not reveal which accounts exist.
    if (!record || !(await verifyPassword(password, record.passwordHash))) {
      return reply.status(401).send(errorBody(INVALID_CREDENTIALS));
    }

    const user = toPublicUser(record);
    const token = await reply.jwtSign(tokenClaimsFor(user));
    const response: LoginResponse = { token, user };

    return response;
  });

  app.get("/api/auth/me", { preValidation: [app.authenticate] }, async (request, reply) => {
    const record = await repository.findUserById(request.user.sub);

    if (!record) {
      return reply.status(401).send(errorBody("User for this token no longer exists"));
    }

    return toPublicUser(record);
  });
}
