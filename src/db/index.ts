/* import { SQL } from "bun";
import { config } from "../config";

export const db = new SQL({
  url: config.databaseUrl,
  ssl: true,
});
 */

import { Pool } from "pg";
import { config } from "../config/index.js";

export const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});