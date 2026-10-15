import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` (run by postinstall) doesn't connect, so a fresh checkout without a
    // .env can still install; commands that do connect fail with a clear connection error.
    url: process.env.DATABASE_URL ?? "postgresql://missing-database-url@localhost:5432/missing",
  },
});
