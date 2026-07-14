"use client";
import Image, { ImageLoaderProps } from "next/image";
import { blurhashToBase64 } from "blurhash-base64";
import { useState, useCallback } from "react";
import { nearestThumbWidth } from "@/app/lib/thumbs";

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
  code,
  sizes,
  priority,
}: {
  imageName: string;
  descricao: string;
  hash?: string | null;
  album_id: number;
  width: number;
  height: number;
  className: string;
  code?: string | null;
  sizes?: string;
  priority?: boolean;
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);

  // Maps each requested width to the nearest pre-generated WebP rendition,
  // bypassing /_next/image entirely (no on-server re-encoding).
  const loader = useCallback(
    ({ width: w }: ImageLoaderProps) => {
      const params = new URLSearchParams({ w: String(nearestThumbWidth(w)) });
      if (code) params.set("code", code);
      return `/api/images/${album_id}/${imageName}?${params.toString()}`;
    },
    [album_id, imageName, code]
  );

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
      src={`/api/images/${album_id}/${imageName}`}
      loader={loader}
      sizes={sizes}
      alt={descricao || "Image description"}
      blurDataURL={blurhashToBase64(hash || "")}
      placeholder={hash ? "blur" : undefined}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      className={className}
      onError={handleError}
    />
  );
};

export default Photo;
