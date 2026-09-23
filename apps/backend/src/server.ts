import { existsSync } from "node:fs";
import { createApp } from "./app.js";

// Prisma reads .env on its own; load it here too so JWT_SECRET (and PORT)
// reach process.env. Variables already set in the environment win.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to apps/backend/.env (see .env.example).");
  process.exit(1);
}

const app = createApp(undefined, { jwtSecret: JWT_SECRET });

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
