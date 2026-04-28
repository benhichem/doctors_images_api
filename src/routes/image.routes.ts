import { Hono } from "hono";
import { imageStorage } from "../storage";

export const imageRoutes = new Hono();

imageRoutes.get("/:npi", async (c) => {
  const npi = c.req.param("npi");

  // For cloud backends the image_url in the DB is already a full CDN URL,
  // so clients won't hit this route. This serves local disk images only.
  const file = Bun.file(`${process.env.LOCAL_IMAGE_DIR ?? "images"}/${npi}.jpg`);
  if (!await file.exists()) return c.notFound();
  return new Response(file, { headers: { "Content-Type": "image/jpeg" } });
});
