/* import { Hono } from "hono";
import { config } from "./config/index.js";
import { doctorRoutes } from "./routes/doctor.routes.js";
import { imageRoutes } from "./routes/image.routes.js";

const app = new Hono();

app.route("/doctors", doctorRoutes);
app.route("/images", imageRoutes);

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
});

if (import.meta.main) {
  Bun.serve({
    port: config.port,
    fetch: app.fetch,
  });
  console.log(`Server running on port ${config.port}`);
}

export default app; 
 */

import { serve } from "@hono/node-server";
import { config } from "./config/index.js";
import { doctorRoutes } from "./routes/doctor.routes.js";
import { imageRoutes } from "./routes/image.routes.js";
import { Hono } from "hono";

const app = new Hono();

app.route("/doctors", doctorRoutes);
app.route("/images", imageRoutes);

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
});

serve({
  fetch: app.fetch,
  port: config.port,
});
console.log(`Server running on port ${config.port}`);

export default app;