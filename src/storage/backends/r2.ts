import type { ImageStorage } from "../types";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var for R2 storage: ${key}`);
  return val;
}

export function makeR2Storage(): ImageStorage {
  const accountId   = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretKey   = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket      = requireEnv("R2_BUCKET_NAME");
  const publicBase  = requireEnv("R2_PUBLIC_BASE_URL");

  const client = new Bun.S3Client({
    accessKeyId,
    secretAccessKey: secretKey,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    bucket,
  });

  return {
    publicUrl: (npi) => `${publicBase}/${npi}.jpg`,

    async store(npi, source) {
      try {
        const body = await source.arrayBuffer();
        await client.write(`${npi}.jpg`, body, { type: "image/jpeg" });
        console.log(`[storage] r2         NPI: ${npi} — uploaded`);
        return `${publicBase}/${npi}.jpg`;
      } catch (err) {
        console.log(`[storage] r2         NPI: ${npi} — upload failed: ${err}`);
        return null;
      }
    },

    async delete(npi) {
      await client.delete(`${npi}.jpg`);
    },
  };
}
