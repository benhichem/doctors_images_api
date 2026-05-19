/* import { db } from "./index.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = new URL("./migrations", import.meta.url).pathname;

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = await Bun.file(join(migrationsDir, file)).text();
  await db.unsafe(sql);
  console.log(`Ran migration: ${file}`);
}

console.log("All migrations complete.");
await db.close();
 */

import { db } from "./index.js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const migrationsDir = join(__dirname, "migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  await db.query(sql);
  console.log(`Ran migration: ${file}`);
}

console.log("All migrations complete.");
await db.end();