/* import { config } from "../../config/index.js";
import type { ImageStorage } from "../types";



export function makeR2Storage(): ImageStorage {
  const accountId = config.r2_account_id;
  const accessKeyId = config.r2_access_key;
  const secretKey = config.r2_secret_key;
  const bucket = config.r2_bucket_name;
  const publicBase = config.r2_public_base_url;

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
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../../config/index.js";
import type { ImageStorage } from "../types";

export function makeR2Storage(): ImageStorage {
  const accountId = config.r2_account_id;
  const accessKeyId = config.r2_access_key;
  const secretKey = config.r2_secret_key;
  const bucket = config.r2_bucket_name;
  const publicBase = config.r2_public_base_url;

  if (!accountId || !accessKeyId || !secretKey || !bucket || !publicBase) {
    throw new Error("Missing R2 configuration values");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey: secretKey,
    },
  });

  return {
    publicUrl: (npi) => `${publicBase}/${npi}.jpg`,

    async store(npi, source) {
      try {
        const body = Buffer.from(await source.arrayBuffer());
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${npi}.jpg`,
            Body: body,
            ContentType: "image/jpeg",
          })
        );
        console.log(`[storage] r2         NPI: ${npi} — uploaded`);
        return `${publicBase}/${npi}.jpg`;
      } catch (err) {
        console.log(`[storage] r2         NPI: ${npi} — upload failed: ${err}`);
        return null;
      }
    },

    async delete(npi) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: `${npi}.jpg`,
        })
      );
    },
  };
}