import crypto from "crypto";
import { cache } from "./cache";
import { config } from "./config";
import { getJSON, putJSON, deletePrefix, listBucketPrefixes, listAlbumImages } from "./s3";
import { deleteImagesByAlbum, readImagesJson } from "./images";

function generateAlbumCode(): string {
  return crypto.randomBytes(6).toString("hex"); // 12-char hex code
}

export interface AlbumData {
  id: number;
  nome: string;
  descricao: string | null;
  cover: string | null;
  privado: boolean;
  codigo: string | null;
}

const ALBUMS_KEY = "_albums.json";
const CACHE_KEY_ALBUMS = "albuns";

/**
 * Read the master album list from S3.
 */
async function readAlbums(): Promise<AlbumData[]> {
  return getJSON<AlbumData[]>(ALBUMS_KEY, []);
}

/**
 * Write the master album list to S3 and invalidate cache.
 */
async function writeAlbums(albums: AlbumData[]): Promise<void> {
  await putJSON(ALBUMS_KEY, albums);
  cache.delete(CACHE_KEY_ALBUMS);
}

/**
 * Sync the album list with S3 bucket prefixes.
 * - Adds albums for new S3 folders containing .jpg images.
 * - Removes albums whose S3 folders no longer exist.
 * - Sets cover to the first image for new albums.
 */
async function syncAlbumsWithS3(): Promise<{ albums: AlbumData[]; newAlbums: AlbumData[] }> {
  console.log("[albums] syncAlbumsWithS3: starting sync...");
  const s3Prefixes = await listBucketPrefixes();
  console.log("[albums] S3 prefixes found:", s3Prefixes);
  let albums = await readAlbums();
  console.log("[albums] Existing albums:", albums.map(a => a.nome));

  const existingNames = new Set(albums.map((a) => a.nome));
  const s3Names = new Set(s3Prefixes);

  let changed = false;

  // Remove albums no longer in S3
  const beforeCount = albums.length;
  albums = albums.filter((a) => s3Names.has(a.nome));
  if (albums.length !== beforeCount) changed = true;

  // Add new albums found in S3 and process their images
  let maxId = albums.reduce((max, a) => Math.max(max, a.id), 0);
  const newAlbums: AlbumData[] = [];
  for (const name of s3Prefixes) {
    if (!existingNames.has(name)) {
      const images = await listAlbumImages(name);
      if (images.length > 0) {
        maxId++;
        // Folders starting with "_" are imported as private
        const isPrivate = name.startsWith("_");
        const newAlbum: AlbumData = {
          id: maxId,
          nome: name,
          descricao: null,
          cover: images[0],
          privado: isPrivate,
          codigo: isPrivate ? generateAlbumCode() : null,
        };
        albums.push(newAlbum);
        newAlbums.push(newAlbum);
        changed = true;
      }
    }
  }

  // Check existing albums for unprocessed images
  for (const album of albums) {
    if (!newAlbums.find((a) => a.id === album.id)) {
      const existingImages = await readImagesJson(album.nome);
      if (existingImages.length === 0) {
        newAlbums.push(album);
      }
    }
  }

  // Fix albums with null cover
  for (const album of albums) {
    if (!album.cover) {
      const images = await listAlbumImages(album.nome);
      if (images.length > 0) {
        album.cover = images[0];
        changed = true;
      }
    }
  }

  // Fix private albums that are missing a code
  for (const album of albums) {
    if (album.privado && !album.codigo) {
      album.codigo = generateAlbumCode();
      changed = true;
    }
  }

  if (changed) {
    await writeAlbums(albums);
  }

  return { albums, newAlbums };
}

export async function getAlbums(): Promise<AlbumData[]> {
  const cached = cache.get<AlbumData[]>(CACHE_KEY_ALBUMS);
  if (cached) return cached;

  const { albums } = await syncAlbumsWithS3();
  cache.set(CACHE_KEY_ALBUMS, albums, config.CACHE_TTL);
  return albums;
}

/**
 * Returns albums that need image processing (new or missing images.json).
 * Should be called from server-side code only.
 */
export async function getAlbumsNeedingProcessing(): Promise<AlbumData[]> {
  const { newAlbums } = await syncAlbumsWithS3();
  return newAlbums;
}

export async function getAlbum(albumId: number): Promise<AlbumData | null> {
  const albums = await readAlbums();
  return albums.find((a) => a.id === albumId) ?? null;
}

export async function getAlbumByName(nome: string): Promise<AlbumData | null> {
  const albums = await readAlbums();
  return albums.find((a) => a.nome === nome) ?? null;
}

export async function createAlbum(
  nome: string,
  descricao: string
): Promise<AlbumData> {
  const albums = await readAlbums();

  // Auto-increment ID
  const maxId = albums.reduce((max, a) => Math.max(max, a.id), 0);
  const newAlbum: AlbumData = {
    id: maxId + 1,
    nome,
    descricao,
    cover: null,
    privado: false,
    codigo: null,
  };

  albums.push(newAlbum);
  await writeAlbums(albums);
  return newAlbum;
}

export async function deleteAlbum(albumId: number): Promise<boolean> {
  const albums = await readAlbums();
  const idx = albums.findIndex((a) => a.id === albumId);
  if (idx === -1) return false;

  const album = albums[idx];

  // Delete image metadata
  await deleteImagesByAlbum(albumId, album.nome);

  // Delete all S3 objects under the album prefix (images + metadata)
  await deletePrefix(`${album.nome}/`);

  // Remove from album list
  albums.splice(idx, 1);
  await writeAlbums(albums);

  return true;
}

export async function updateCover(
  albumId: number,
  imageName: string
): Promise<boolean> {
  const albums = await readAlbums();
  const album = albums.find((a) => a.id === albumId);
  if (!album) return false;

  album.cover = imageName;
  await writeAlbums(albums);
  return true;
}

/**
 * Get only public albums (non-private).
 */
export async function getPublicAlbums(): Promise<AlbumData[]> {
  const albums = await getAlbums();
  return albums.filter((a) => !a.privado);
}

/**
 * Toggle an album's privacy. When making private, generates a code.
 * When making public, removes the code.
 */
export async function toggleAlbumPrivacy(
  albumId: number,
  privado: boolean
): Promise<{ success: boolean; codigo?: string }> {
  const albums = await readAlbums();
  const album = albums.find((a) => a.id === albumId);
  if (!album) return { success: false };

  album.privado = privado;
  album.codigo = privado ? generateAlbumCode() : null;

  await writeAlbums(albums);
  return { success: true, codigo: album.codigo ?? undefined };
}

/**
 * Validate access code for a private album.
 * Returns true if album is public or code matches.
 */
export async function validateAlbumCode(
  albumId: number,
  code: string | null
): Promise<boolean> {
  const album = await getAlbum(albumId);
  if (!album) return false;
  if (!album.privado) return true;
  if (!code) return false;
  return album.codigo === code;
}

/**
 * Regenerate the access code for a private album.
 */
export async function regenerateAlbumCode(
  albumId: number
): Promise<{ success: boolean; codigo?: string }> {
  const albums = await readAlbums();
  const album = albums.find((a) => a.id === albumId);
  if (!album || !album.privado) return { success: false };

  album.codigo = generateAlbumCode();
  await writeAlbums(albums);
  return { success: true, codigo: album.codigo };
}
