"use client";
import React from "react";
import Link from "next/link";
import { useAdminApi } from "@/app/lib/admin-api-client";
import { AlbumData } from "@/app/lib/albums";

interface AlbumSummary extends AlbumData {
  photoCount: number;
}

async function fetchPhotoCount(
  adminFetch: ReturnType<typeof useAdminApi>["adminFetch"],
  album: AlbumData
): Promise<number> {
  let imagesUrl = `/api/images/${album.id}`;

  if (album.privado) {
    const detailRes = await adminFetch(`/api/albums/${album.id}`);
    if (!detailRes.ok) return 0;
    const detail = await detailRes.json();
    if (!detail.codigo) return 0;
    imagesUrl += `?code=${encodeURIComponent(detail.codigo)}`;
  }

  const imagesRes = await adminFetch(imagesUrl);
  if (!imagesRes.ok) return 0;
  const data = await imagesRes.json();
  return (data.images || []).length;
}

const AdminHome: React.FC = () => {
  const { adminFetch } = useAdminApi();
  const [albums, setAlbums] = React.useState<AlbumSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function loadAlbums() {
      setLoading(true);
      const listRes = await adminFetch("/api/albums");
      if (!listRes.ok) {
        if (!cancelled) setLoading(false);
        return;
      }
      const listData = await listRes.json();
      const baseAlbums: AlbumData[] = listData.albuns || [];

      const summaries = await Promise.all(
        baseAlbums.map(async (album) => ({
          ...album,
          photoCount: await fetchPhotoCount(adminFetch, album),
        }))
      );

      if (!cancelled) {
        setAlbums(summaries);
        setLoading(false);
      }
    }

    loadAlbums();
    return () => {
      cancelled = true;
    };
  }, [adminFetch]);

  if (loading) {
    return <div className="text-gray-400">Carregando álbuns...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Painel de Administração</h1>
      <ul className="divide-y divide-gray-200 border rounded-lg overflow-hidden">
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/admin/${album.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium">
                {album.nome.startsWith("_") ? album.nome.slice(1) : album.nome}
                {album.privado && (
                  <span className="ml-2 text-gray-400" title="Álbum privado">
                    🔒
                  </span>
                )}
              </span>
              <span className="text-sm text-gray-500">
                {album.photoCount} foto{album.photoCount === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
        {albums.length === 0 && (
          <li className="px-4 py-6 text-center text-gray-400">
            Nenhum álbum encontrado.
          </li>
        )}
      </ul>
    </div>
  );
};

export default AdminHome;
