"use client";
import React, { useState } from "react";

interface PrivateAlbumGateProps {
  albumId: string;
  onAccessGranted: (code: string) => void;
}

const PrivateAlbumGate: React.FC<PrivateAlbumGateProps> = ({
  albumId,
  onAccessGranted,
}) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Digite o código de acesso");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/albums/${albumId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: code.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        // Store the code in sessionStorage so it persists during the session
        sessionStorage.setItem(`album_code_${albumId}`, code.trim());
        onAccessGranted(code.trim());
      } else {
        setError("Código de acesso inválido");
      }
    } catch {
      setError("Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Álbum Privado
          </h2>
          <p className="text-gray-500">
            Este álbum é privado. Digite o código de acesso para visualizar as
            fotos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Digite o código de acesso"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono focus:border-blue-500 focus:outline-none transition-colors"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Acessar Álbum"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrivateAlbumGate;
