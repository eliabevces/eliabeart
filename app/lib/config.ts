export const config = {
  // S3 / MinIO settings
  S3_ENDPOINT: process.env.S3_ENDPOINT || "http://minio:9000",
  S3_REGION: process.env.S3_REGION || "us-east-1",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "minioadmin",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "minioadmin",
  S3_BUCKET: process.env.S3_BUCKET || "imagens",

  KEYCLOAK_SERVER_URL: process.env.KEYCLOAK_SERVER_URL || "",
  KEYCLOAK_REALM_NAME: process.env.KEYCLOAK_REALM_NAME || "",
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || "",

  CACHE_TTL: 60, // seconds
};
