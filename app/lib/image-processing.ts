import sharp from "sharp";
import { encode } from "blurhash";
import { cache } from "./cache";
import { getObject, imageKey, listAlbumImages } from "./s3";
import { readImagesJson, writeImagesJson, imagesLockKey, ImageData } from "./images";
import { jsonMutex, processingSemaphore } from "./concurrency";

/**
 * Process a single image from S3: read dimensions, generate blurhash,
 * and return the metadata (does NOT write to S3 — caller batches writes).
 */
export async function processImage(
  albumId: number,
  imageName: string,
  albumName: string
): Promise<ImageData> {
  const key = imageKey(albumName, imageName);
  const imageBuffer = await getObject(key);

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Generate blurhash from a small resized version
  const resizedWidth = 32;
  const resizedHeight =
    width > 0 ? Math.round((height / width) * resizedWidth) || 32 : 32;

  const { data, info } = await image
    .resize(resizedWidth, resizedHeight, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurhash = encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    3
  );

  return {
    nome: imageName,
    descricao: null,
    hash: blurhash,
    album_id: albumId,
    width,
    height,
  };
}

/**
 * Process all new images in an album from S3.
 * Compares S3 objects with images.json and processes only missing ones.
 * Writes the updated images.json back to S3 once at the end.
 */
export async function processAlbumImages(
  albumId: number,
  albumName: string
): Promise<{ processed: string[]; skipped: string[] }> {
  return jsonMutex.runExclusive(imagesLockKey(albumName), async () => {
    const jpgImages = await listAlbumImages(albumName);

    // Get existing image metadata from S3
    const existingImages = await readImagesJson(albumName);
    const existingNames = new Set(existingImages.map((img) => img.nome));

    const newImageNames = jpgImages.filter((name) => !existingNames.has(name));

    // Process new images with limited concurrency (Sharp/BlurHash is CPU-bound)
    const results = await Promise.all(
      newImageNames.map((imageName) =>
        processingSemaphore.run(async () => {
          try {
            return await processImage(albumId, imageName, albumName);
          } catch (error) {
            console.error(`Failed to process image ${imageName}:`, error);
            return null;
          }
        })
      )
    );

    const newEntries = results.filter((entry): entry is ImageData => entry !== null);
    const processed = newEntries.map((entry) => entry.nome);

    // Write updated images.json in a single put
    if (newEntries.length > 0) {
      const allImages = [...existingImages, ...newEntries];
      await writeImagesJson(albumName, allImages);
      cache.delete(`album_${albumId}_images`);
    }

    return { processed, skipped: jpgImages.filter((n) => existingNames.has(n)) };
  });
}
