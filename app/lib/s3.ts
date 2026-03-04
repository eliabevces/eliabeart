import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { config } from "./config";

const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | undefined;
};

export const s3 =
  globalForS3.s3Client ??
  new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO

  });

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3Client = s3;
}

const BUCKET = config.S3_BUCKET;

/**
 * Get an object (image) from S3/MinIO as a Buffer.
 */
export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error(`Empty body for key: ${key}`);
  }

  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Put an object into S3/MinIO.
 */
export async function putObject(
  key: string,
  body: Buffer | string,
  contentType: string = "application/octet-stream"
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: typeof body === "string" ? Buffer.from(body, "utf-8") : body,
    ContentType: contentType,
  });
  await s3.send(command);
}

/**
 * Read and parse a JSON file from S3. Returns fallback if not found.
 */
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const buf = await getObject(key);
    return JSON.parse(buf.toString("utf-8")) as T;
  } catch {
    return fallback;
  }
}

/**
 * Write a JSON file to S3.
 */
export async function putJSON(key: string, data: unknown): Promise<void> {
  await putObject(key, JSON.stringify(data, null, 2), "application/json");
}

/**
 * Check if an object exists in S3/MinIO.
 */
export async function objectExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    await s3.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a single object from S3/MinIO.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(command);
}

/**
 * Delete all objects under a given prefix (e.g. an album folder).
 */
export async function deletePrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(listCommand);

    if (response.Contents && response.Contents.length > 0) {
      const objects = response.Contents.filter((o) => o.Key).map((o) => ({
        Key: o.Key!,
      }));

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: objects },
      });
      await s3.send(deleteCommand);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
}

/**
 * List all .jpg image names (without extension) under a given prefix (album folder).
 */
export async function listAlbumImages(albumName: string): Promise<string[]> {
  const prefix = `${albumName}/`;
  const images: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key.endsWith(".jpg")) {
          const fileName = obj.Key.slice(prefix.length).replace(".jpg", "");
          if (!fileName.includes("/") && fileName.length > 0) {
            images.push(fileName);
          }
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return images;
}

/**
 * List all top-level "folder" prefixes in the bucket.
 * Each prefix corresponds to a potential album (e.g. "MeuAlbum").
 */
export async function listBucketPrefixes(): Promise<string[]> {
  const prefixes: string[] = [];
  let continuationToken: string | undefined;

  console.log("[s3] listBucketPrefixes: endpoint =", config.S3_ENDPOINT, "bucket =", BUCKET);

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      });
      const response = await s3.send(command);

      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const name = prefix.Prefix.replace(/\/$/, "");
            if (name && !name.startsWith("_")) {
              prefixes.push(name);
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  } catch (error) {
    console.error("[s3] listBucketPrefixes FAILED:", error);
    throw error;
  }

  console.log("[s3] listBucketPrefixes result:", prefixes);
  return prefixes;
}

/**
 * Build the S3 key for an image given album name and image name.
 */
export function imageKey(albumName: string, imageName: string): string {
  return `${albumName}/${imageName}.jpg`;
}
