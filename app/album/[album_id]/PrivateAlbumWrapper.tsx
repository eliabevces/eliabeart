"use client";
import React, { useState, useEffect } from "react";
import PrivateAlbumGate from "@components/PrivateAlbumGate";
import AlbumClient from "./AlbumClient";
import { Foto } from "@/app/types/Foto";

interface PrivateAlbumWrapperProps {
  albumId: string;
}

const PrivateAlbumWrapper: React.FC<PrivateAlbumWrapperProps> = ({
  albumId,
}) => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [images, setImages] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);

  // Check if we already have a code in sessionStorage
  useEffect(() => {
    const storedCode = sessionStorage.getItem(`album_code_${albumId}`);
    if (storedCode) {
      verifyAndLoadImages(storedCode);
    } else {
      setLoading(false);
    }
  }, [albumId]);

  const verifyAndLoadImages = async (accessCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/images/${albumId}?code=${encodeURIComponent(accessCode)}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
        setAccessGranted(true);
        setCode(accessCode);
      } else {
        // Invalid stored code, remove it
        sessionStorage.removeItem(`album_code_${albumId}`);
        setAccessGranted(false);
      }
    } catch {
      sessionStorage.removeItem(`album_code_${albumId}`);
      setAccessGranted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessGranted = (accessCode: string) => {
    setCode(accessCode);
    verifyAndLoadImages(accessCode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!accessGranted) {
    return <PrivateAlbumGate albumId={albumId} onAccessGranted={handleAccessGranted} />;
  }

  return <AlbumClient images={images} album_id={albumId} />;
};

export default PrivateAlbumWrapper;
