"use client";
import React from "react";
import Photo from "@components/Photo";
import { random_photo } from "@lib/api-client";
import { Foto } from "../types/Foto";

const MAX_WIDTH_FACTOR = 0.8; // 80vw
const MAX_HEIGHT_FACTOR = 0.8; // 80vh

const Random: React.FC = () => {
  const [foto, setFoto] = React.useState<Foto>(
    {} as Foto
  );
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchRandomPhoto = async () => {
      const randomPhoto = await random_photo();
      console.log("Random photo fetched:", randomPhoto);
      if (randomPhoto) {
        setFoto(randomPhoto);
      }
    };

    fetchRandomPhoto();
  }, []);

  const [constrainedDimensions, setConstrainedDimensions] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });

  React.useEffect(() => {
    if (foto.width && foto.height) {
      const calculateConstrainedDimensions = (originalWidth: number, originalHeight: number) => {
      const maxWidth = window.innerWidth * MAX_WIDTH_FACTOR; 
      const maxHeight = window.innerHeight * MAX_HEIGHT_FACTOR;
      
      const aspectRatio = originalWidth / originalHeight;
      
      let constrainedWidth = originalWidth;
      let constrainedHeight = originalHeight;
      
      // Scale down if width exceeds container
      if (constrainedWidth > maxWidth) {
        constrainedWidth = maxWidth;
        constrainedHeight = constrainedWidth / aspectRatio;
      }
      
      // Scale down if height exceeds container
      if (constrainedHeight > maxHeight) {
        constrainedHeight = maxHeight;
        constrainedWidth = constrainedHeight * aspectRatio;
      }
    
      return { width: Math.round(constrainedWidth), height: Math.round(constrainedHeight) };
    };
    
      setConstrainedDimensions(calculateConstrainedDimensions(foto.width, foto.height));
    }
  }, [foto.width, foto.height]);
  return (
    <div
      className="flex items-center justify-center m-4"
      style={{ height: "80vh" }}
    >
      {foto && foto.nome && foto.width && foto.height ? (
        <Photo
          imageName={foto.nome}
          descricao={foto.descricao || ""}
          hash={foto.hash || undefined}
          album_id={foto.album_id}
          width={constrainedDimensions.width}
          height={constrainedDimensions.height}
          className="max-w-[80vw] max-h-full object-contain max-h-[100vh]"
        />
      ) : (
        <span>Loading...</span>
      )}
    </div>
  );
};

export default Random;
