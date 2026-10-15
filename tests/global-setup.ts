import { execSync } from "node:child_process";
import "dotenv/config";
import pg from "pg";

/**
 * Integration tests run against a separate database (never the dev one):
 * derive `<dev db>_test` from DATABASE_URL, create it if missing, and apply migrations.
 * If the migration history no longer matches (the schema was rebuilt), the test database is
 * simply recreated: it only ever holds throwaway test data.
 * It talks to Postgres directly, so it works the same locally and on a CI service container.
 */
export default async function setup() {
  const dev = new URL(process.env.DATABASE_URL!);
  const testName = `${dev.pathname.slice(1)}_test`;
  const test = new URL(dev);
  test.pathname = `/${testName}`;

  const admin = new URL(dev);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();

  const deploy = () =>
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: test.toString() },
      stdio: "ignore",
    });
  const recreate = async () => {
    await client.query(`DROP DATABASE IF EXISTS "${testName}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${testName}"`);
  };

  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [testName]);
    if (!exists.rowCount) await client.query(`CREATE DATABASE "${testName}"`);
    process.env.DATABASE_URL = test.toString();
    try {
      deploy();
    } catch {
      await recreate();
      deploy();
    }
  } finally {
    await client.end();
  }
}
