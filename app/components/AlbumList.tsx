import React from "react";
import Link from "next/link";
import Photo from "@components/Photo";

interface AlbumListProps {
  albuns: { id: number; nome: string; cover: string | null; descricao: string | null }[];
}

const AlbumList: React.FC<AlbumListProps> = ({ albuns }) => {
  if (!Array.isArray(albuns)) return <></>;

  return (
    <div className="flex items-center justify-center">
      {albuns.map((album, index) => (
        <div key={album.id} className="flex-shrink-0 w-80">
          <Link href={`/album/${album.id}`} className="flex flex-col items-center text-center bg-white rounded-lg shadow-lg transition-transform transform hover:-translate-y-1 hover:shadow-2xl border-2 border-gray-200 p-4">
              <Photo
                imageName={album.cover || ""}
                descricao={""}
                hash={""}
                album_id={album.id}
                width={700}
                height={700}
                className="w-50 h-80 object-cover rounded-t-lg"
              />
              <h2 className="mt-4 mb-2 text-lg font-semibold">{album.nome}</h2>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default AlbumList;
