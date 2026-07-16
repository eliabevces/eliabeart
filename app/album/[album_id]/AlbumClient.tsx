"use client";
import React from "react";
import PhotoModal from "@components/PhotoModal";
import Photo from "@components/Photo";
import { Foto } from "@/app/types/Foto";

// Grid container is w-[80vw]; each cell is a fixed fraction of a 6-column grid.
const GRID_SIZES =
  "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 13vw";

// Images rendered eagerly at the top of the album (LCP candidates).
const PRIORITY_COUNT = 12;

// Progressive rendering: keeps the DOM small on large albums; the sentinel
// appends the next batch as it approaches the viewport.
const BATCH_SIZE = 42;

interface AlbumClientProps {
  images: Foto[];
  album_id: string;
  code?: string | null;
  albumName?: string;
  rollNum?: number;
}

type FrameFoto = Foto & { n: number };

const AlbumClient: React.FC<AlbumClientProps> = ({
  images: initialImages,
  album_id,
  code,
  albumName,
  rollNum,
}) => {
  const [images, setImages] = React.useState<Foto[]>(initialImages);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState<
    number | null
  >(null);
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  const [filter, setFilter] = React.useState<"all" | "marked">("all");
  const [sort, setSort] = React.useState<"date" | "best">("date");
  const [toast, setToast] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) =>
            Math.min(count + BATCH_SIZE, images.length)
          );
        }
      },
      { rootMargin: "1000px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [images.length, visibleCount]);

  const framed: FrameFoto[] = React.useMemo(
    () => images.map((img, i) => ({ ...img, n: i + 1 })),
    [images]
  );

  const filtered = React.useMemo(
    () => (filter === "marked" ? framed.filter((f) => f.marcado) : framed),
    [framed, filter]
  );

  const sorted = React.useMemo(() => {
    if (sort !== "best") return filtered;
    return [...filtered].sort((a, b) => {
      if (!!a.marcado === !!b.marcado) return a.n - b.n;
      return a.marcado ? -1 : 1;
    });
  }, [filtered, sort]);

  const visibleImages = sorted.slice(0, visibleCount);
  const markedCount = images.filter((img) => img.marcado).length;

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentImageIndex(null);
  };

  const toggleMark = async (imageName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = images.find((img) => img.nome === imageName);
    if (!target) return;
    const next = !target.marcado;

    setImages((prev) =>
      prev.map((img) =>
        img.nome === imageName ? { ...img, marcado: next } : img
      )
    );

    try {
      const params = new URLSearchParams();
      if (code) params.set("code", code);
      const qs = params.toString();
      const res = await fetch(
        `/api/images/${album_id}/${encodeURIComponent(imageName)}${qs ? `?${qs}` : ""}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marcado: next }),
        }
      );
      if (!res.ok) throw new Error("mark failed");
    } catch {
      // Revert optimistic update on failure
      setImages((prev) =>
        prev.map((img) =>
          img.nome === imageName ? { ...img, marcado: !next } : img
        )
      );
    }
  };

  const downloadMarked = async () => {
    if (markedCount === 0 || downloading) return;
    setDownloading(true);
    clearTimeout(toastTimerRef.current);
    setToast(
      `Preparando download de ${markedCount} foto${markedCount === 1 ? "" : "s"} marcada${markedCount === 1 ? "" : "s"}…`
    );
    try {
      const params = new URLSearchParams({ album_id });
      if (code) params.set("code", code);
      const downloadUrl = `/api/download/bulk?${params.toString()}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
      toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    }
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--active)" : "transparent",
    color: "var(--foreground)",
    borderColor: "var(--border-strong)",
  });

  const displayName = albumName
    ? albumName.startsWith("_")
      ? albumName.slice(1)
      : albumName
    : null;
  const rollLabel =
    rollNum != null ? ` — Roll ${String(rollNum).padStart(3, "0")}` : "";

  return (
    <div className="relative min-h-[60vh] px-11 pt-2 pb-10">
      {/* album title header */}
      {displayName && (
        <div className="flex items-baseline justify-between pt-7 pb-[18px]">
          <span
            className="text-[22px] font-serif-italic"
            style={{ color: "var(--foreground)" }}
          >
            {displayName}
            {rollLabel}
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            {images.length} frame{images.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-3.5 text-[11px] uppercase tracking-[.05em]">
        <div className="flex gap-1.5">
          <button
            className="border px-3.5 py-1.5 cursor-pointer"
            style={btnStyle(filter === "all")}
            onClick={() => setFilter("all")}
          >
            Todos
          </button>
          <button
            className="border px-3.5 py-1.5 cursor-pointer"
            style={btnStyle(filter === "marked")}
            onClick={() => setFilter("marked")}
          >
            Marcados
          </button>
        </div>
        <div className="flex gap-1.5 items-center">
          <button
            className="border px-3.5 py-1.5 cursor-pointer"
            style={btnStyle(sort === "date")}
            onClick={() => setSort("date")}
          >
            Data ↓
          </button>
          <button
            className="border px-3.5 py-1.5 cursor-pointer"
            style={btnStyle(sort === "best")}
            onClick={() => setSort("best")}
          >
            Melhores ★
          </button>
          <button
            className="border px-3.5 py-1.5"
            style={{
              background: "var(--mark-wash)",
              color: "var(--mark-bright)",
              borderColor: "var(--mark)",
              cursor: markedCount === 0 ? "default" : "pointer",
              opacity: markedCount === 0 ? 0.4 : 1,
            }}
            disabled={markedCount === 0}
            onClick={downloadMarked}
          >
            ⭳ Baixar marcados ({markedCount})
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="text-[12px] px-3.5 py-2.5 mb-3.5 border"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--mark)",
            color: "var(--foreground)",
          }}
        >
          {toast}
        </div>
      )}

      <div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 p-1.5"
        style={{ background: "var(--surface)" }}
      >
        {visibleImages.map((image) => {
          const { nome: imageName, descricao, hash, width, height, marcado, n } =
            image;
          const sortedIndex = sorted.findIndex((f) => f.nome === imageName);

          return (
            <div
              key={imageName}
              className="relative aspect-square cursor-pointer overflow-hidden group"
              onClick={() => openModal(sortedIndex)}
            >
              {/* object-contain, not cover: this is a contact sheet of whole
                  negatives, so every frame must show the full photo. Letterbox
                  bars fall back to the grid's dark background, reading as the
                  sheet between frames rather than empty space. */}
              <Photo
                imageName={imageName}
                descricao={descricao || ""}
                hash={hash}
                album_id={Number(album_id)}
                width={width || 0}
                height={height || 0}
                className="object-contain w-full h-full transition-[filter] duration-200 group-hover:brightness-125"
                code={code}
                sizes={GRID_SIZES}
                priority={n <= PRIORITY_COUNT}
              />
              <span
                className="absolute bottom-1.5 left-1.5 text-[10px]"
                style={{ color: "var(--accent)" }}
              >
                {String(n).padStart(2, "0")}
              </span>
              {marcado && (
                <div
                  className="absolute inset-1.5 rounded-full pointer-events-none"
                  style={{ border: "2px solid var(--mark)", transform: "rotate(-8deg)" }}
                />
              )}
              <button
                className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full text-[10px] leading-none flex items-center justify-center"
                style={{
                  border: "1px solid var(--mark)",
                  background: "var(--scrim)",
                  color: "var(--mark)",
                }}
                onClick={(e) => toggleMark(imageName, e)}
                aria-label={marcado ? "Desmarcar" : "Marcar"}
              >
                ●
              </button>
            </div>
          );
        })}
      </div>

      {visibleCount < sorted.length && (
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      )}

      {isModalOpen && currentImageIndex !== null && (
        <PhotoModal
          isOpen={isModalOpen}
          onClose={closeModal}
          images={sorted}
          index={currentImageIndex}
          album_id={album_id}
          code={code}
          onToggleMark={toggleMark}
        />
      )}

      {!isModalOpen && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-5 right-5 text-2xl p-5 shadow-lg transition duration-300 rounded-full z-50 ${
            images.length > 0 ? "block" : "hidden"
          }`}
          style={{ background: "var(--surface-raised)", color: "var(--foreground)" }}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default AlbumClient;
