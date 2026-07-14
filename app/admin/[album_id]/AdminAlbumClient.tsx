"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Photo from "@components/Photo";
import ConfirmDialog from "@/app/admin/ConfirmDialog";
import { useAdminApi } from "@/app/lib/admin-api-client";
import { AlbumData } from "@/app/lib/albums";
import { ImageData } from "@/app/lib/images";
import { UploadResult } from "@/app/types/AdminUpload";

type DeleteTarget = { type: "image"; imageName: string } | { type: "album" };

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg"];

interface AdminAlbumClientProps {
  albumId: string;
}

const AdminAlbumClient: React.FC<AdminAlbumClientProps> = ({ albumId: album_id }) => {
  const { adminFetch } = useAdminApi();
  const router = useRouter();

  const [album, setAlbum] = React.useState<AlbumData | null>(null);
  const [images, setImages] = React.useState<ImageData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [uploadResults, setUploadResults] = React.useState<UploadResult[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [privacyLoading, setPrivacyLoading] = React.useState(false);
  const [coverLoading, setCoverLoading] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadAlbum = React.useCallback(async () => {
    setLoading(true);
    const albumRes = await adminFetch(`/api/albums/${album_id}`);
    if (!albumRes.ok) {
      setAlbum(null);
      setLoading(false);
      return;
    }
    const albumData: AlbumData = await albumRes.json();
    setAlbum(albumData);

    const imagesUrl =
      albumData.privado && albumData.codigo
        ? `/api/images/${album_id}?code=${encodeURIComponent(albumData.codigo)}`
        : `/api/images/${album_id}`;
    const imagesRes = await adminFetch(imagesUrl);
    const imagesData = imagesRes.ok ? await imagesRes.json() : { images: [] };
    setImages(imagesData.images || []);
    setLoading(false);
  }, [adminFetch, album_id]);

  React.useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  const handleUpload = async () => {
    const input = fileInputRef.current;
    if (!input?.files || input.files.length === 0 || !album) return;

    const formData = new FormData();
    const clientRejected: UploadResult[] = [];

    Array.from(input.files).forEach((file) => {
      const lowerName = file.name.toLowerCase();
      const isValid = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
      if (isValid) {
        formData.append("files", file);
      } else {
        clientRejected.push({
          fileName: file.name,
          status: "error",
          error: "Formato não suportado (apenas .jpg/.jpeg)",
        });
      }
    });

    setUploading(true);
    setUploadResults(clientRejected);

    if (formData.getAll("files").length > 0) {
      const res = await adminFetch(`/api/albums/${album.id}/images`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadResults((prev) => [...prev, ...((data.results as UploadResult[]) || [])]);
        await loadAlbum();
      } else {
        setUploadResults((prev) => [
          ...prev,
          { fileName: "(lote)", status: "error", error: "Falha ao enviar o lote" },
        ]);
      }
    }

    setUploading(false);
    if (input) input.value = "";
  };

  const handleTogglePrivacy = async () => {
    if (!album) return;
    setPrivacyLoading(true);
    const res = await adminFetch(`/api/albums/${album.id}/privacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privado: !album.privado }),
    });
    if (res.ok) {
      await loadAlbum();
    }
    setPrivacyLoading(false);
  };

  const handleRegenerateCode = async () => {
    if (!album) return;
    setPrivacyLoading(true);
    const res = await adminFetch(`/api/albums/${album.id}/privacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true }),
    });
    if (res.ok) {
      await loadAlbum();
    }
    setPrivacyLoading(false);
  };

  const handleSetCover = async (imageName: string) => {
    if (!album) return;
    setCoverLoading(imageName);
    const res = await adminFetch(`/api/albums/${album.id}/cover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageName }),
    });
    if (res.ok) {
      await loadAlbum();
    }
    setCoverLoading(null);
  };

  const handleConfirmDelete = async () => {
    if (!album || !deleteTarget) return;
    setDeleting(true);

    if (deleteTarget.type === "image") {
      const res = await adminFetch(`/api/albums/${album.id}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageName: deleteTarget.imageName }),
      });
      setDeleting(false);
      setDeleteTarget(null);
      if (res.ok) {
        await loadAlbum();
      }
    } else {
      const res = await adminFetch(`/api/albums/${album.id}`, { method: "DELETE" });
      setDeleting(false);
      setDeleteTarget(null);
      if (res.ok) {
        router.push("/admin");
      }
    }
  };

  if (loading) {
    return <div className="text-gray-400">Carregando álbum...</div>;
  }

  if (!album) {
    return <div className="text-gray-500">Álbum não encontrado.</div>;
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Voltar
      </Link>
      <div className="flex items-center justify-between my-4">
        <h1 className="text-2xl font-semibold">
          {album.nome.startsWith("_") ? album.nome.slice(1) : album.nome}
          {album.privado && <span className="ml-2 text-gray-400">🔒</span>}
        </h1>
        <button
          onClick={() => setDeleteTarget({ type: "album" })}
          className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50"
        >
          Excluir álbum
        </button>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "album" ? "Excluir álbum" : "Excluir imagem"
        }
        message={
          deleteTarget?.type === "album"
            ? "Esta ação exclui o álbum e todas as suas imagens permanentemente. Não pode ser desfeita."
            : "Esta ação exclui a imagem permanentemente. Não pode ser desfeita."
        }
        confirmLabel={deleting ? "Excluindo..." : "Excluir"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <section className="mb-6 p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">Privacidade</h2>
        <p className="text-sm text-gray-600 mb-2">
          Este álbum é atualmente {album.privado ? "privado" : "público"}.
        </p>
        {album.privado && album.codigo && (
          <p className="text-sm mb-2">
            Código de acesso:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">{album.codigo}</code>
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleTogglePrivacy}
            disabled={privacyLoading}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            {album.privado ? "Tornar público" : "Tornar privado"}
          </button>
          {album.privado && (
            <button
              onClick={handleRegenerateCode}
              disabled={privacyLoading}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Regenerar código
            </button>
          )}
        </div>
      </section>

      <section className="my-6 p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">Enviar imagens</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg"
          multiple
          disabled={uploading}
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="ml-2 px-3 py-1 bg-black text-white rounded disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "Enviar"}
        </button>

        {uploadResults.length > 0 && (
          <ul className="mt-3 text-sm space-y-1">
            {uploadResults.map((result, idx) => (
              <li
                key={`${result.fileName}-${idx}`}
                className={
                  result.status === "success" ? "text-green-600" : "text-red-600"
                }
              >
                {result.fileName}:{" "}
                {result.status === "success" ? "enviado com sucesso" : result.error}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
        {images.map((image) => (
          <div key={image.nome} className="relative group">
            <Photo
              imageName={image.nome}
              descricao={image.descricao || ""}
              hash={image.hash}
              album_id={album.id}
              width={image.width || 0}
              height={image.height || 0}
              className="w-full h-32 object-cover rounded"
              code={album.codigo}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 pb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
              <button
                onClick={() => handleSetCover(image.nome)}
                disabled={coverLoading === image.nome || album.cover === image.nome}
                className="px-2 py-1 text-xs bg-white rounded disabled:opacity-50"
              >
                {album.cover === image.nome ? "Capa atual" : "Definir como capa"}
              </button>
              <button
                onClick={() => setDeleteTarget({ type: "image", imageName: image.nome })}
                className="px-2 py-1 text-xs bg-white text-red-600 rounded"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full text-gray-400">
            Nenhuma imagem neste álbum ainda.
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminAlbumClient;
