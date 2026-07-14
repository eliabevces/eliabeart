import AdminAlbumClient from "./AdminAlbumClient";

export default async function AdminAlbumPage({
  params,
}: {
  params: Promise<{ album_id: string }>;
}) {
  const { album_id } = await params;
  return <AdminAlbumClient albumId={album_id} />;
}
