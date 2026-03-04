import { getAlbums as getAlbumsFromS3, getAlbum } from "./albums";
import { getImagesByAlbum } from "./images";

/**
 * Server-side: fetch album photos directly from S3 metadata.
 */
export const get_album_photos = async (album_id: string) => {
  try {
    const albumId = parseInt(album_id, 10);
    if (isNaN(albumId)) return [];
    const images = await getImagesByAlbum(albumId);
    return images;
  } catch (error) {
    console.error("Error fetching album photos:", error);
    return [];
  }
};

/**
 * Server-side: fetch all public albums from S3 metadata.
 */
export const get_albuns = async () => {
  try {
    const albums = await getAlbumsFromS3();
    return albums;
  } catch (error) {
    console.error("Error fetching albums:", error);
    return [];
  }
};

/**
 * Server-side: get album info by ID.
 */
export const get_album_info = async (album_id: string) => {
  try {
    const albumId = parseInt(album_id, 10);
    if (isNaN(albumId)) return null;
    return await getAlbum(albumId);
  } catch (error) {
    console.error("Error fetching album info:", error);
    return null;
  }
};

