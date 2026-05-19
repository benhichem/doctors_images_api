import type { ImageStorage } from "./types";
import { makeLocalStorage } from "./backends/local.js";
import { makeR2Storage } from "./backends/r2.js";

function createStorage(): ImageStorage {
  const backend = process.env.IMAGE_STORAGE_BACKEND ?? "local";

  switch (backend) {
    case "r2": return makeR2Storage();
    case "local": return makeLocalStorage();
    default: throw new Error(`Unknown IMAGE_STORAGE_BACKEND: "${backend}". Valid options: local, r2`);
  }
}

export const imageStorage: ImageStorage = createStorage();
