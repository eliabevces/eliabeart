import { getAlbums as getAlbumsFromS3, getAlbum } from "./albums";
import { getImagesByAlbum } from "./images";

// Number of preview frames pulled per album for the home "Rolls" filmstrip
// scrub strip. Higher than the number visible at once (6) so dragging the
// roll has more of the album to reveal.
const PREVIEW_FRAME_COUNT = 18;

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
 * Server-side: fetch all public albums from S3 metadata, enriched with a
 * handful of preview frames (for the home "Rolls" filmstrip scrub strip)
 * and the total frame count.
 */
export const get_albuns = async () => {
  try {
    const albums = await getAlbumsFromS3();
    return await Promise.all(
      albums.map(async (album) => {
        const images = await getImagesByAlbum(album.id);
        // Deliberately omit `codigo` (the private-album access secret) — this
        // list is passed to client components and would otherwise leak it.
        // Private albums only ever expose their cover as a public teaser
        // (same rule the image-serving route enforces), so don't hand out
        // other frame names/hashes for the filmstrip preview.
        const previewImages = album.privado
          ? images.filter((img) => img.nome === album.cover)
          : images;
        return {
          id: album.id,
          nome: album.nome,
          descricao: album.descricao,
          cover: album.cover,
          privado: album.privado,
          frameCount: images.length,
          frames: previewImages.slice(0, PREVIEW_FRAME_COUNT).map((img) => ({
            nome: img.nome,
            hash: img.hash,
            width: img.width,
            height: img.height,
          })),
        };
      })
    );
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

