import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { config } from "../../config/index.js";
import type { ImageStorage } from "../types";

export function makeLocalStorage(): ImageStorage {
  const dir = config.local_image_dir ?? "images";
  const base = config.local_image_base_url ?? "/images";

  // ensure directory exists at startup
  mkdirSync(dir, { recursive: true });

  return {
    publicUrl: (npi) => `${base}/${npi}`,

    async store(npi, source) {
      try {
        const buffer = Buffer.from(await source.arrayBuffer());
        writeFileSync(`${dir}/${npi}.jpg`, buffer);
        console.log(`[storage] local      NPI: ${npi} — saved`);
        return `${base}/${npi}`;
      } catch {
        console.log(`[storage] local      NPI: ${npi} — write failed`);
        return null;
      }
    },

    async delete(npi) {
      rmSync(`${dir}/${npi}.jpg`, { force: true });
    },
  };
}