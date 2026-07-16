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
      <div
        className="p-8 max-w-md w-full mx-4 border"
        style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔒</div>
          <h2
            className="text-2xl font-serif-italic mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Álbum Privado
          </h2>
          <p style={{ color: "var(--muted-strong)" }}>
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
              className="w-full px-4 py-3 border text-center text-lg tracking-widest focus:outline-none transition-colors"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-strong)",
                color: "var(--foreground)",
              }}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--mark)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-semibold uppercase tracking-[.06em] text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border"
            style={{
              background: "var(--active)",
              color: "var(--foreground)",
              borderColor: "var(--mark)",
            }}
          >
            {loading ? "Verificando..." : "Acessar Álbum"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrivateAlbumGate;
