import Image from "next/image";
import { blurhashToBase64 } from "blurhash-base64";

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
}) => (
  <Image
    width={width}
    height={height}
    src={`/api/images/${album_id}/${imageName}`}
    alt={descricao || "Image description"}
    blurDataURL={blurhashToBase64(hash || "")}
    placeholder={hash ? "blur" : undefined}
    loading="lazy"
    className={className}
  />
);

export default Photo;
