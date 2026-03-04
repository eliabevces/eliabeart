import React, { useState, useEffect } from "react";
import Photo from "./Photo";

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  index: number;
  images: { nome: string; hash: string | null; width: number | null; height: number | null }[];
  album_id: string;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  index: initialIndex,
  images,
  album_id,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Sync index with initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Minimum distance for a swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && index < images.length - 1) {
      setIndex(index + 1);
    }
    if (isRightSwipe && index > 0) {
      setIndex(index - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out p-4"
      onClick={onClose}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.stopPropagation();
          if (index > 0) {
            setIndex(index - 1);
          }
        }
        if (e.key === "ArrowRight") {
          e.stopPropagation();
          if (index < images.length - 1) {
            setIndex(index + 1);
          }
        }
      }}
    >
      {index > 0 && (
        <button
          className="absolute top-1/2 left-2 md:left-4 transform -translate-y-1/2 bg-black text-white p-1 md:p-2 rounded-full shadow-md hover:bg-gray-800 transform transition-transform duration-300 hover:scale-150 ease-in-out text-sm md:text-base"
          onClick={(e) => {
            e.stopPropagation();
            if (index > 0) {
              setIndex(index - 1);
            }
          }}
        >
          {"<"}
        </button>
      )}
      <div
        className="relative transition-transform duration-300 ease-in-out hover:text-gray-700 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div>
          <button
            className="absolute top-1 right-2 md:right-4 text-white text-xl md:text-2xl transform transition-transform duration-100 hover:scale-150"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((prev) => !prev);
            }}
          >
            ...
          </button>
          {dropdownOpen && (
            <div className="absolute top-1 right-0 mt-10 w-30 bg-white rounded-md shadow-lg z-10">
              <ul className="py-1">
                <li
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    
                    const downloadUrl = `/api/download?album_id=${album_id}&image_name=${encodeURIComponent(images[index].nome)}`;
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = ""; // Let the server set the filename
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Download
                </li>
              </ul>
            </div>
          )}
        </div>
        <button
          className="absolute top-2 md:top-4 left-2 md:left-4 text-white text-xl md:text-2xl hover:text-gray-300 transform transition-transform duration-100 hover:scale-150"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(false);
            const newTab = window.open(
              `/api/images/${album_id}/${images[index].nome}`,
              "_blank"
            );
            if (newTab) {
              newTab.focus();
            } else {
              console.error("Failed to open new tab");
            }
          }}
        >
          ⤢
        </button>
        <Photo
          imageName={images[index].nome}
          descricao={""}
          hash={images[index].hash}
          album_id={Number(album_id)}
          width={images[index].width || 0}
          height={images[index].height || 0}
          className="object-contain w-full h-full max-w-[90vw] max-h-[90vh] md:max-w-2xl md:max-h-2xl"
        />
      </div>
      {index < images.length - 1 && (
        <button
          className="absolute top-1/2 right-2 md:right-4 transform -translate-y-1/2 bg-black text-white p-1 md:p-2 rounded-full shadow-md hover:bg-gray-800 transform transition-transform duration-300 hover:scale-150 ease-in-out text-sm md:text-base"
          onClick={(e) => {
            e.stopPropagation();
            if (index < images.length - 1) {
              setIndex(index + 1);
            }
          }}
        >
          {">"}
        </button>
      )}
    </div>
  );
};

export default PhotoModal;
