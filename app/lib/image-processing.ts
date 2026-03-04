import sharp from "sharp";
import { encode } from "blurhash";
import { cache } from "./cache";
import { getObject, imageKey, listAlbumImages } from "./s3";
import { readImagesJson, writeImagesJson, ImageData } from "./images";

/**
 * Process a single image from S3: read dimensions, generate blurhash,
 * and return the metadata (does NOT write to S3 — caller batches writes).
 */
async function processImage(
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
  const jpgImages = await listAlbumImages(albumName);

  // Get existing image metadata from S3
  const existingImages = await readImagesJson(albumName);
  const existingNames = new Set(existingImages.map((img) => img.nome));

  const newImageNames = jpgImages.filter((name) => !existingNames.has(name));
  const processed: string[] = [];
  const newEntries: ImageData[] = [];

  for (const imageName of newImageNames) {
    try {
      const entry = await processImage(albumId, imageName, albumName);
      newEntries.push(entry);
      processed.push(imageName);
    } catch (error) {
      console.error(`Failed to process image ${imageName}:`, error);
    }
  }

  // Write updated images.json in a single put
  if (newEntries.length > 0) {
    const allImages = [...existingImages, ...newEntries];
    await writeImagesJson(albumName, allImages);
    cache.delete(`album_${albumId}_images`);
  }

  return { processed, skipped: jpgImages.filter((n) => existingNames.has(n)) };
}
