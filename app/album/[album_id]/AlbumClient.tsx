"use client";
import React from "react";
import PhotoModal from "@components/PhotoModal";
import Photo from "@components/Photo";
import { Foto } from "@/app/types/Foto";

interface AlbumClientProps {
  images: Foto[];
  album_id: string;
}

const AlbumClient: React.FC<AlbumClientProps> = ({ images, album_id }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState<
    number | null
  >(null);

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentImageIndex(null);
  };

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
        {images?.map((image, index) => {
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
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {isModalOpen && currentImageIndex !== null && (
        <PhotoModal
          isOpen={isModalOpen}
          onClose={closeModal}
          images={images}
          index={currentImageIndex}
          album_id={album_id}
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