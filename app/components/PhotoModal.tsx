"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Photo from "./Photo";
import { nearestThumbWidth } from "@/app/lib/thumbs";

// Stage is min(1100px, 92vw) wide, minus the sprocket rails' padding.
const MODAL_SIZES = "(max-width: 1200px) 92vw, 1100px";

interface LoupeFoto {
  nome: string;
  hash: string | null;
  width: number | null;
  height: number | null;
  marcado?: boolean;
}

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  index: number;
  images: LoupeFoto[];
  album_id: string;
  code?: string | null;
  onToggleMark?: (imageName: string) => void;
}

const SPROCKETS = Array.from({ length: 32 });

// Circular magnifier: how much it enlarges the displayed photo, and its radius.
const MAG_SCALE = 2.2;
const MAG_RADIUS = 70;

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  index: initialIndex,
  images,
  album_id,
  code,
  onToggleMark,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Zoom and pan offset live in one state: wheel-zoom has to update both from
  // the same starting values, and rapid wheel events would read a stale zoom
  // out of two separate states.
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  // Stage size travels with the cursor position: the magnifier needs it to work
  // out where the letterboxed photo actually sits inside the stage.
  const [magnifier, setMagnifier] = useState<{
    visible: boolean;
    x: number;
    y: number;
    stageW: number;
    stageH: number;
  }>({ visible: false, x: 0, y: 0, stageW: 0, stageH: 0 });

  const dragRef = useRef<{ startX: number; startY: number; startT: number; startOffX: number; startOffY: number }>({
    startX: 0,
    startY: 0,
    startT: 0,
    startOffX: 0,
    startOffY: 0,
  });
  const stageRef = useRef<HTMLDivElement>(null);

  const lastIndex = images.length - 1;
  const current = images[index];

  const resetView = useCallback(() => {
    setView({ zoom: 1, x: 0, y: 0 });
  }, []);

  // Sync index with initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
      resetView();
    }
  }, [isOpen, initialIndex, resetView]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(lastIndex, Math.max(0, next));
      setIndex(clamped);
      setView({ zoom: 1, x: 0, y: 0 });
    },
    [lastIndex]
  );

  // Keyboard: arrows navigate, space toggles mark
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.code === "Space") {
        e.preventDefault();
        if (current && onToggleMark) onToggleMark(current.nome);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, index, goTo, current, onToggleMark, onClose]);

  // Keeps the scaled content covering the stage, so panning/zooming near an
  // edge can't drag the frame off into empty space.
  const clampPan = (x: number, y: number, zoom: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    const maxX = (rect.width * (zoom - 1)) / 2;
    const maxY = (rect.height * (zoom - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Cursor offset from the stage centre, which is what scale() pivots on.
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const dir = e.deltaY < 0 ? 1 : -1;

    setView((v) => {
      const zoom = Math.min(3, Math.max(1, +(v.zoom + dir * 0.2).toFixed(2)));
      if (zoom === v.zoom) return v;
      if (zoom === 1) return { zoom: 1, x: 0, y: 0 };
      // Anchor the point under the cursor. A point p renders at
      //   screen = centre + (p - centre) * zoom + offset
      // so holding p fixed as zoom changes by `ratio` gives the offset below.
      const ratio = zoom / v.zoom;
      const { x, y } = clampPan(
        dx - (dx - v.x) * ratio,
        dy - (dy - v.y) * ratio,
        zoom
      );
      return { zoom, x, y };
    });
  };

  const handlePhotoDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startT: Date.now(),
      startOffX: view.x,
      startOffY: view.y,
    };
  };

  const handlePhotoMove = (e: React.MouseEvent) => {
    const stage = stageRef.current;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      setMagnifier({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        stageW: rect.width,
        stageH: rect.height,
      });
    }
    if (dragging && view.zoom > 1) {
      // Pan when zoomed in
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setView((v) => ({
        ...v,
        ...clampPan(
          dragRef.current.startOffX + dx,
          dragRef.current.startOffY + dy,
          v.zoom
        ),
      }));
    }
  };

  const finishDrag = (endX: number) => {
    const { startX, startT } = dragRef.current;
    const dx = endX - startX;
    const dt = Date.now() - startT;
    const velocity = dx / (dt || 1);
    const threshold = 60;
    // Only swipe-navigate at 1x zoom (otherwise a drag is a pan)
    if (view.zoom === 1) {
      if (dx < -threshold || velocity < -0.5) {
        goTo(index + 1);
      } else if (dx > threshold || velocity > 0.5) {
        goTo(index - 1);
      }
    }
    setDragging(false);
  };

  const handlePhotoUp = (e: React.MouseEvent) => {
    if (dragging) finishDrag(e.clientX);
  };

  const handlePhotoLeave = (e: React.MouseEvent) => {
    setMagnifier((m) => ({ ...m, visible: false }));
    if (dragging) finishDrag(e.clientX);
  };

  const handleSprocketScrub = (e: React.MouseEvent) => {
    if (e.buttons !== 1) return; // only while dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(frac * lastIndex);
    if (idx !== index) goTo(idx);
  };

  if (!isOpen || !current) return null;

  const imgUrl = (name: string, w?: number) => {
    const params = new URLSearchParams();
    if (w) params.set("w", String(nearestThumbWidth(w)));
    if (code) params.set("code", code);
    const qs = params.toString();
    return `/api/images/${album_id}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`;
  };

  const loupeLabel = `${String(index + 1).padStart(2, "0")}/${images.length}`;
  const magBg = imgUrl(current.nome, 2048);

  // object-contain letterboxes the frame, so the photo rarely fills the stage.
  // Sampling the magnifier against the stage box instead of the photo box makes
  // it show a point far from the cursor, so reproduce the contain maths here.
  const photoBox = (() => {
    const natW = current.width || 0;
    const natH = current.height || 0;
    const { stageW, stageH } = magnifier;
    if (!natW || !natH || !stageW || !stageH) return null;
    const scale = Math.min(stageW / natW, stageH / natH);
    const w = natW * scale;
    const h = natH * scale;
    return { w, h, left: (stageW - w) / 2, top: (stageH - h) / 2 };
  })();

  const magStyle = (() => {
    if (!photoBox) return null;
    const u = (magnifier.x - photoBox.left) / photoBox.w;
    const v = (magnifier.y - photoBox.top) / photoBox.h;
    // Cursor is out over the letterbox bars, not the photo.
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const bgW = photoBox.w * MAG_SCALE;
    const bgH = photoBox.h * MAG_SCALE;
    return {
      backgroundSize: `${bgW}px ${bgH}px`,
      backgroundPosition: `${MAG_RADIUS - u * bgW}px ${MAG_RADIUS - v * bgH}px`,
    };
  })();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-col"
          style={{ width: "min(1100px, 92vw)", background: "var(--surface-raised)" }}
        >
          {/* top sprocket rail (scrub) */}
          <div
            className="h-4 flex justify-around items-center px-2 cursor-ew-resize"
            onMouseMove={handleSprocketScrub}
          >
            {SPROCKETS.map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2 rounded-sm flex-shrink-0"
                style={{ background: "var(--sprocket)" }}
              />
            ))}
          </div>

          {/* photo stage */}
          <div
            ref={stageRef}
            className="relative overflow-hidden select-none"
            style={{ height: "min(72vh, 620px)", cursor: dragging ? "grabbing" : "grab" }}
            onWheel={handleWheel}
            onMouseDown={handlePhotoDown}
            onMouseMove={handlePhotoMove}
            onMouseUp={handlePhotoUp}
            onMouseLeave={handlePhotoLeave}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                transition: dragging ? "none" : "transform .25s ease",
              }}
            >
              {/* Fill the stage box and letterbox inside it: object-contain
                  guarantees no frame is ever cropped, portrait or landscape,
                  while w/h-full lets small frames scale up instead of
                  floating at their intrinsic size. */}
              <Photo
                imageName={current.nome}
                descricao=""
                hash={current.hash}
                album_id={Number(album_id)}
                width={current.width || 0}
                height={current.height || 0}
                className="object-contain w-full h-full pointer-events-none"
                code={code}
                sizes={MODAL_SIZES}
                priority
              />
            </div>

            {/* circular magnifier following the cursor */}
            {magnifier.visible && view.zoom === 1 && magStyle && (
              <div
                className="absolute rounded-full pointer-events-none overflow-hidden"
                style={{
                  left: magnifier.x,
                  top: magnifier.y,
                  width: MAG_RADIUS * 2,
                  height: MAG_RADIUS * 2,
                  marginLeft: -MAG_RADIUS,
                  marginTop: -MAG_RADIUS,
                  border: "2px solid var(--accent)",
                  boxShadow: "0 8px 20px rgba(0,0,0,.5)",
                  backgroundImage: `url("${magBg}")`,
                  backgroundRepeat: "no-repeat",
                  ...magStyle,
                }}
              />
            )}

            {/* mark toggle */}
            <button
              className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-full text-sm"
              style={{
                border: "1px solid var(--mark)",
                background: "var(--scrim)",
                color: current.marcado ? "var(--mark)" : "var(--muted-dim)",
              }}
              onClick={() => onToggleMark?.(current.nome)}
              aria-label={current.marcado ? "Desmarcar" : "Marcar"}
            >
              ●
            </button>

            {/* open full image + download menu */}
            <button
              className="absolute top-2.5 left-2.5 text-xl"
              style={{ color: "var(--foreground)" }}
              onClick={() => {
                setDropdownOpen(false);
                window.open(imgUrl(current.nome), "_blank")?.focus();
              }}
              aria-label="Abrir imagem"
            >
              ⤢
            </button>
            <button
              className="absolute bottom-2 right-2.5 text-xl leading-none"
              style={{ color: "var(--foreground)" }}
              onClick={() => setDropdownOpen((p) => !p)}
              aria-label="Mais opções"
            >
              ...
            </button>
            {dropdownOpen && (
              <div
                className="absolute bottom-8 right-2.5 rounded-md shadow-lg z-10"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                <button
                  className="block px-4 py-2 text-sm cursor-pointer w-full text-left"
                  style={{ color: "var(--foreground)" }}
                  onClick={() => {
                    setDropdownOpen(false);
                    const params = new URLSearchParams({
                      album_id,
                      image_name: current.nome,
                    });
                    if (code) params.set("code", code);
                    const link = document.createElement("a");
                    link.href = `/api/download?${params.toString()}`;
                    link.download = "";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Download
                </button>
              </div>
            )}
          </div>

          {/* bottom sprocket rail (scrub) */}
          <div
            className="h-4 flex justify-around items-center px-2 cursor-ew-resize"
            onMouseMove={handleSprocketScrub}
          >
            {SPROCKETS.map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2 rounded-sm flex-shrink-0"
                style={{ background: "var(--sprocket)" }}
              />
            ))}
          </div>
        </div>

        {/* preload neighbors */}
        <div className="hidden" aria-hidden="true">
          {[index - 1, index + 1]
            .filter((i) => i >= 0 && i <= lastIndex)
            .map((i) => (
              <Photo
                key={images[i].nome}
                imageName={images[i].nome}
                descricao=""
                hash={images[i].hash}
                album_id={Number(album_id)}
                width={images[i].width || 0}
                height={images[i].height || 0}
                className=""
                code={code}
                sizes={MODAL_SIZES}
                priority
              />
            ))}
        </div>

        {/* footer nav */}
        <div
          className="flex items-center gap-5 text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          <button
            className="bg-transparent border-none cursor-pointer"
            style={{ color: "inherit", fontFamily: "inherit", fontSize: "12px" }}
            onClick={() => goTo(index - 1)}
          >
            ‹ prev
          </button>
          <span>
            FRAME {loupeLabel} · zoom {view.zoom.toFixed(1)}x
          </span>
          <button
            className="bg-transparent border-none cursor-pointer"
            style={{ color: "inherit", fontFamily: "inherit", fontSize: "12px" }}
            onClick={() => goTo(index + 1)}
          >
            next ›
          </button>
        </div>
        <div
          className="text-[10px] tracking-[.05em] text-center"
          style={{ color: "var(--muted-dim)" }}
        >
          arraste a foto ou use ← → para trocar de frame
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;
