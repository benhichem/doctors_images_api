import { db } from "./index";
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
