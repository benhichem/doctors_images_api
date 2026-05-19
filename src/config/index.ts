import dotenv from "dotenv"
dotenv.config()

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const config = {
  databaseUrl: requireEnv("DATABASE_URL"),
  port: parseInt(process.env["PORT"] ?? "3000", 10),
  image_storage_backend: process.env["IMAGE_STORAGE_BACKEND"] ?? "local",
  local_image_dir: process.env["LOCAL_IMAGE_DIR"] ?? "./images",
  local_image_base_url: process.env["LOCAL_IMAGE_BASE_URL"] ?? "/images",

  r2_account_id: process.env["R2_ACCOUNT_ID"],
  r2_access_key: process.env["R2_ACCESS_KEY_ID"],
  r2_secret_key: process.env["R2_SECRET_ACCESS_KEY"],
  r2_bucket_name: process.env["R2_BUCKET_NAME"],
  r2_public_base_url: process.env["R2_PUBLIC_BASE_URL"],

  WEBMD_CLIENT_ID: process.env["WEBMD_CLIENT_ID"],
  WEBMD_ENC_DATA: process.env["WEBMD_ENC_DATA"],
  WEBMD_TIMESTAMP: process.env["WEBMD_TIMESTAMP"]

};
