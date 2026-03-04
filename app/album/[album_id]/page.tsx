import { get_album_photos, get_album_info } from "@lib/api";
import AlbumClient from "./AlbumClient";
import PrivateAlbumWrapper from "./PrivateAlbumWrapper";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ album_id: string }>;
}) {
  const { album_id } = await params;
  const album = await get_album_info(album_id);

  if (!album) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 text-xl">Álbum não encontrado</p>
      </div>
    );
  }

  // If album is private, show the gate (client-side)
  if (album.privado) {
    return <PrivateAlbumWrapper albumId={album_id} />;
  }

  // Public album — load photos directly
  const images = await get_album_photos(album_id);
  return <AlbumClient images={images} album_id={album_id} />;
}
