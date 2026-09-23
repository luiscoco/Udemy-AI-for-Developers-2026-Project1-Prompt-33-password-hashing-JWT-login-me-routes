import { randomBytes } from "node:crypto";
import Fastify from "fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import type { ApiError } from "@equipment-hub/contract";
import { buildDashboardSummary } from "./domain/dashboard.js";
import type { TokenClaims } from "./domain/auth.js";
import { createRepository } from "./data/repository.js";
import type { Repository } from "./data/repository.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWorkOrderRoutes } from "./routes/workOrders.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: TokenClaims;
    user: TokenClaims;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export interface AppOptions {
  /**
   * Secret used to sign and verify JWTs. Defaults to JWT_SECRET; if that is
   * unset too, a random per-process secret is used (tokens then do not
   * survive a restart). server.ts refuses to start without JWT_SECRET.
   */
  jwtSecret?: string;
}

const TOKEN_LIFETIME = "8h";

export function createApp(repository: Repository = createRepository(), options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? randomBytes(32).toString("hex");

  app.register(fastifyJwt, { secret: jwtSecret, sign: { expiresIn: TOKEN_LIFETIME } });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      const body: ApiError = { message: "Missing or invalid bearer token" };
      await reply.status(401).send(body);
    }
  });

  app.get("/api/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/assets", async () => {
    return await repository.listAssets();
  });

  app.get("/api/technicians", async () => {
    return await repository.listTechnicians();
  });

  app.get("/api/dashboard/summary", async () => {
    return buildDashboardSummary(await repository.listWorkOrders());
  });

  registerAuthRoutes(app, repository);
  registerWorkOrderRoutes(app, repository);

  return app;
}
