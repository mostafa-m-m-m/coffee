import "dotenv/config";
import { Client } from "pg";

/**
 * The purchase flows take stock from the demo database, so after a few runs the first product on
 * the shelf is sold out and every test that opens it fails for a reason unrelated to the code.
 * Top up anything running low before each run (nothing is ever lowered).
 */
export default async function setup() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(`UPDATE "ProductVariant" SET stock = 60 WHERE stock < 30 AND NOT "isArchived"`);
  } finally {
    await db.end();
  }
}
