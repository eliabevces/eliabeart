export const config = {
  // S3 / MinIO settings
  S3_ENDPOINT: process.env.S3_ENDPOINT || "http://minio:9000",
  S3_REGION: process.env.S3_REGION || "us-east-1",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "minioadmin",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "minioadmin",
  S3_BUCKET: process.env.S3_BUCKET || "imagens",

  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",

  // Metadata cache TTL. Writes already invalidate explicitly via
  // cache.delete(), so a long TTL only avoids needless S3 re-syncs.
  CACHE_TTL: 3600, // seconds
};
