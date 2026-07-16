import React from "react";
import RollRow from "@components/RollRow";
import FeaturedFrame from "@components/FeaturedFrame";

interface Frame {
  nome: string;
  hash: string | null;
  width: number | null;
  height: number | null;
}

interface AlbumListProps {
  albuns: {
    id: number;
    nome: string;
    cover: string | null;
    descricao: string | null;
    privado?: boolean;
    frameCount: number;
    frames: Frame[];
  }[];
}

const AlbumList: React.FC<AlbumListProps> = ({ albuns }) => {
  if (!Array.isArray(albuns)) return <></>;

  return (
    <div className="w-full">
      <div
        className="text-[11px] uppercase tracking-[.1em] mb-[18px]"
        style={{ color: "var(--muted)" }}
      >
        Rolls
      </div>

      <FeaturedFrame />

      <div className="flex flex-col gap-[22px]">
        {albuns.map((album) => (
          <RollRow
            key={album.id}
            albumId={album.id}
            num={album.id}
            nome={album.nome}
            frames={album.frames}
            frameCount={album.frameCount}
            privado={album.privado}
          />
        ))}
      </div>
    </div>
  );
};

export default AlbumList;
