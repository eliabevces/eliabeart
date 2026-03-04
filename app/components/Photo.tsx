"use client";
import Image from "next/image";
import { blurhashToBase64 } from "blurhash-base64";
import { useState, useCallback } from "react";

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;

const Photo = ({
  imageName,
  descricao,
  hash,
  album_id,
  width,
  height,
  className,
}: {
  imageName: string;
  descricao: string;
  hash?: string | null;
  album_id: number;
  width: number;
  height: number;
  className: string;
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = `/api/images/${album_id}/${imageName}`;

  const handleError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        setRetryCount((c) => c + 1);
      }, RETRY_DELAY_MS * (retryCount + 1));
    } else {
      setFailed(true);
    }
  }, [retryCount]);

  if (failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 text-gray-400 text-xs`}
        style={{ minHeight: 80 }}
      >
        Imagem indisponível
      </div>
    );
  }

  return (
    <Image
      key={retryCount}
      width={width}
      height={height}
      src={src}
      alt={descricao || "Image description"}
      blurDataURL={blurhashToBase64(hash || "")}
      placeholder={hash ? "blur" : undefined}
      loading="lazy"
      className={className}
      onError={handleError}
    />
  );
};

export default Photo;
