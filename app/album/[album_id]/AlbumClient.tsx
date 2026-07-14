"use client";
import React from "react";
import PhotoModal from "@components/PhotoModal";
import Photo from "@components/Photo";
import { Foto } from "@/app/types/Foto";

// Masonry container is w-[80vw] split into 1/2/3/4 columns per breakpoint.
const GRID_SIZES =
  "(max-width: 640px) 80vw, (max-width: 768px) 40vw, (max-width: 1024px) 27vw, 20vw";

// Images rendered eagerly at the top of the album (LCP candidates).
const PRIORITY_COUNT = 8;

// Progressive rendering: keeps the DOM small on large albums; the sentinel
// appends the next batch as it approaches the viewport.
const BATCH_SIZE = 30;

interface AlbumClientProps {
  images: Foto[];
  album_id: string;
  code?: string | null;
}

const AlbumClient: React.FC<AlbumClientProps> = ({ images, album_id, code }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState<
    number | null
  >(null);
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

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
    // Re-observe after each batch: observe() re-fires the callback with the
    // current intersection state, so a sentinel still in view (short batches,
    // fast scroll) keeps loading instead of stalling.
  }, [images.length, visibleCount]);

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentImageIndex(null);
  };

  const visibleImages = images?.slice(0, visibleCount);

  return (
    <div className="relative min-h-[80vh] w-[80vw] mx-auto">
      <div
        className="columns-1
        sm:columns-2
        md:columns-3
        lg:columns-4
        xl:columns-4
        gap-6
        p-8
        pb-20
        font-[family-name:var(--font-geist-sans)]"
      >
        {visibleImages?.map((image, index) => {
          const { nome: imageName, descricao, hash, width, height } = image;

          return (
            <div key={imageName} className="mb-6 break-inside-avoid">
              <div
                className="relative w-full h-auto cursor-pointer group"
                onClick={() => openModal(index)}
              >
                <Photo
                  imageName={imageName}
                  descricao={descricao || ""}
                  hash={hash}
                  album_id={Number(album_id)}
                  width={width || 0}
                  height={height || 0}
                  className="object-cover w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  code={code}
                  sizes={GRID_SIZES}
                  priority={index < PRIORITY_COUNT}
                />
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < (images?.length ?? 0) && (
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      )}

      {isModalOpen && currentImageIndex !== null && (
        <PhotoModal
          isOpen={isModalOpen}
          onClose={closeModal}
          images={images}
          index={currentImageIndex}
          album_id={album_id}
          code={code}
        />
      )}

      {!isModalOpen && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-5 right-5 text-black text-2xl p-5 shadow-lg hover:text-blue-600 transition duration-300 rounded-full bg-white z-50 ${
            images && images.length > 0 ? "block" : "hidden"
          }`}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default AlbumClient;
