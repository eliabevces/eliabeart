import { get_album_photos } from "@lib/api";
import AlbumClient from "./AlbumClient";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ album_id: string }>;
}) {
  const { album_id } = await params;
  const images = await get_album_photos(album_id);

  return <AlbumClient images={images} album_id={album_id} />;
}
