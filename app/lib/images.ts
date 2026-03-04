import { cache } from "./cache";
import { config } from "./config";
import { getJSON, putJSON, deleteObject } from "./s3";
import { getAlbum, getAlbums, getPublicAlbums } from "./albums";

export interface ImageData {
  nome: string;
  descricao: string | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  album_id: number;
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

  // Collect all images across all albums
  const allImages: ImageData[] = [];
  for (const album of albums) {
    const images = await readImagesJson(album.nome);
    allImages.push(...images);
  }

  if (allImages.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * allImages.length);
  return allImages[randomIndex];
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

  const nameSet = new Set(names);
  const images = await readImagesJson(album.nome);
  const remaining = images.filter((img) => !nameSet.has(img.nome));
  await writeImagesJson(album.nome, remaining);
  cache.delete(`album_${albumId}_images`);
}
