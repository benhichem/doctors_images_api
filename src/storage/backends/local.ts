import type { ImageStorage } from "../types";

export function makeLocalStorage(): ImageStorage {
  const dir  = process.env.LOCAL_IMAGE_DIR     ?? "images";
  const base = process.env.LOCAL_IMAGE_BASE_URL ?? "/images";

  // ensure directory exists at startup
  Bun.$`mkdir -p ${dir}`.quiet();

  return {
    publicUrl: (npi) => `${base}/${npi}`,

    async store(npi, source) {
      try {
        await Bun.write(`${dir}/${npi}.jpg`, source);
        console.log(`[storage] local      NPI: ${npi} — saved`);
        return `${base}/${npi}`;
      } catch {
        console.log(`[storage] local      NPI: ${npi} — write failed`);
        return null;
      }
    },

    async delete(npi) {
      await Bun.$`rm -f ${dir}/${npi}.jpg`.quiet();
    },
  };
}
