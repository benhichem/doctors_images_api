import { SQL } from "bun";
import { config } from "../config";

export const db = new SQL({
  url: config.databaseUrl,
  ssl: "require",
});
