const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const config = {
  databaseUrl: requireEnv("DATABASE_URL"),
  port: parseInt(process.env["PORT"] ?? "3000", 10),
};
