import { cache } from "./cache";
import { config } from "./config";
import { getJSON, putJSON, deleteObject } from "./s3";
import { getAlbum, getAlbums, getPublicAlbums } from "./albums";
import { jsonMutex } from "./concurrency";

export function imagesLockKey(albumName: string): string {
  return `images:${albumName}`;
}

export interface ImageData {
  nome: string;
  descricao: string | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  album_id: number;
  marcado?: boolean;
}

/**
 * S3 key for the images.json metadata file of a given album.
 */
function imagesKey(albumName: string): string {
  return `${albumName}/images.json`;
}

/**
 * Read the images metadata for an album from S3.
 */
export async function readImagesJson(albumName: string): Promise<ImageData[]> {
  return getJSON<ImageData[]>(imagesKey(albumName), []);
}

/**
 * Write the images metadata for an album to S3.
 */
export async function writeImagesJson(
  albumName: string,
  images: ImageData[]
): Promise<void> {
  await putJSON(imagesKey(albumName), images);
}

export async function getImagesByAlbum(albumId: number): Promise<ImageData[]> {
  const cacheKey = `album_${albumId}_images`;
  const cached = cache.get<ImageData[]>(cacheKey);
  if (cached) return cached;

  // Find album name by ID
  const album = await getAlbum(albumId);
  if (!album) return [];

  const images = await readImagesJson(album.nome);
  cache.set(cacheKey, images, config.CACHE_TTL);
  return images;
}

export async function getRandomImage(): Promise<ImageData | null> {
  const albums = await getPublicAlbums();
  if (albums.length === 0) return null;

  // Collect all images across all albums, reusing the per-album cache
  const allImages: ImageData[] = [];
  for (const album of albums) {
    const images = await getImagesByAlbum(album.id);
    allImages.push(...images);
  }

  if (allImages.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * allImages.length);
  return allImages[randomIndex];
}

export interface RandomStrip {
  /** The featured frame plus its real neighbours on the same roll. */
  frames: ImageData[];
  /** Position of the featured frame within `frames`. */
  featuredIndex: number;
}

/**
 * Pick a random public image and return it together with the frames that sit
 * next to it on the same roll, so the hero can show a continuous strip.
 * Picks uniformly across every image (not per album), matching getRandomImage.
 */
export async function getRandomStrip(radius = 2): Promise<RandomStrip | null> {
  const albums = await getPublicAlbums();

  const perAlbum: ImageData[][] = [];
  let total = 0;
  for (const album of albums) {
    const images = await getImagesByAlbum(album.id);
    if (images.length > 0) {
      perAlbum.push(images);
      total += images.length;
    }
  }
  if (total === 0) return null;

  let pick = Math.floor(Math.random() * total);
  for (const images of perAlbum) {
    if (pick < images.length) {
      const start = Math.max(0, pick - radius);
      const end = Math.min(images.length, pick + radius + 1);
      return { frames: images.slice(start, end), featuredIndex: pick - start };
    }
    pick -= images.length;
  }
  return null;
}

export async function getImageByNameAndAlbum(
  nome: string,
  albumId: number
): Promise<ImageData | null> {
  const images = await getImagesByAlbum(albumId);
  return images.find((img) => img.nome === nome) ?? null;
}

export async function deleteImagesByAlbum(
  albumId: number,
  albumName: string
): Promise<void> {
  await deleteObject(imagesKey(albumName));
  cache.delete(`album_${albumId}_images`);
}

export async function deleteImagesByNames(
  names: string[],
  albumId: number
): Promise<void> {
  const albums = await getAlbums();
  const album = albums.find((a) => a.id === albumId);
  if (!album) return;

  await jsonMutex.runExclusive(imagesLockKey(album.nome), async () => {
    const nameSet = new Set(names);
    const images = await readImagesJson(album.nome);
    const remaining = images.filter((img) => !nameSet.has(img.nome));
    await writeImagesJson(album.nome, remaining);
  });
  cache.delete(`album_${albumId}_images`);
}

/**
 * Toggle the "marcado" (marked/favorite) flag on a single image within an
 * album. Returns false if the album or image doesn't exist.
 */
export async function setImageMarked(
  albumId: number,
  albumName: string,
  imageName: string,
  marcado: boolean
): Promise<boolean> {
  const updated = await jsonMutex.runExclusive(
    imagesLockKey(albumName),
    async () => {
      const images = await readImagesJson(albumName);
      const image = images.find((img) => img.nome === imageName);
      if (!image) return false;

      image.marcado = marcado;
      await writeImagesJson(albumName, images);
      return true;
    }
  );

  if (updated) cache.delete(`album_${albumId}_images`);
  return updated;
}
