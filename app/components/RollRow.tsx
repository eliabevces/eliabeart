"use client";
import React from "react";
import Link from "next/link";
import Photo from "@components/Photo";

interface Frame {
  nome: string;
  hash: string | null;
  width: number | null;
  height: number | null;
}

interface RollRowProps {
  albumId: number;
  num: number;
  nome: string;
  frames: Frame[];
  frameCount: number;
  privado?: boolean;
}

const FRAME_PX = 72;
const VIEWPORT_FRAMES = 6;
const VIEWPORT_PX = VIEWPORT_FRAMES * FRAME_PX;
// Frames just outside the visible window are still mounted so they're
// already loaded by the time a drag scrolls them into view.
const RENDER_BUFFER_FRAMES = 3;
// Hole every ~12px of strip, spread edge to edge so the perforation runs the
// full length of the strip instead of stopping partway along it.
const HOLE_PITCH_PX = 12;

const SprocketRow: React.FC<{ cols: number }> = ({ cols }) => (
  <div className="flex justify-between px-1.5 py-[3px]">
    {Array.from({ length: cols }).map((_, i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 flex-shrink-0"
        style={{ borderRadius: 1, background: "var(--sprocket)" }}
      />
    ))}
  </div>
);

// The canister the strip appears to be pulled out of.
const Canister: React.FC = () => (
  <div
    className="relative w-[88px] h-[116px] flex items-center justify-center flex-shrink-0 ml-2.5"
    style={{
      background:
        "linear-gradient(90deg, var(--canister-edge), var(--canister-face), var(--canister-edge))",
      borderRadius: 8,
      boxShadow: "0 4px 10px rgba(0,0,0,.4)",
    }}
  >
    <div
      className="w-[30px] h-[30px] rounded-full"
      style={{
        background: "var(--canister-spool)",
        border: "2px solid var(--canister-rim)",
      }}
    />
    <div
      className="absolute -top-2 w-5 h-3"
      style={{ background: "var(--canister-tab)", borderRadius: 2 }}
    />
  </div>
);

const RollRow: React.FC<RollRowProps> = ({
  albumId,
  num,
  nome,
  frames,
  frameCount,
  privado,
}) => {
  const displayName = nome.startsWith("_") ? nome.slice(1) : nome;
  const count = Math.max(frames.length, 1);
  const stripWidth = count * FRAME_PX;
  const maxOffset = Math.max(0, stripWidth - VIEWPORT_PX);
  const sprocketCols = Math.max(2, Math.round(stripWidth / HOLE_PITCH_PX));

  // How far the roll has been pulled out of the canister, in px (0..maxOffset).
  const [offset, setOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const rowRef = React.useRef<HTMLAnchorElement>(null);
  // Tracks whether the current pointer gesture crossed the drag threshold, so
  // the click that follows pointerup can be suppressed instead of navigating.
  const draggedRef = React.useRef(false);
  const dragStartRef = React.useRef<{ x: number; offset: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (maxOffset <= 0) return; // nothing more to reveal, let the click through
    dragStartRef.current = { x: e.clientX, offset };
    draggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    if (!draggedRef.current && Math.abs(dx) > 6) {
      draggedRef.current = true;
      setIsDragging(true);
    }
    if (draggedRef.current) {
      const next = Math.min(
        maxOffset,
        Math.max(0, dragStartRef.current.offset - dx)
      );
      setOffset(next);
    }
  };

  const endDrag = () => {
    dragStartRef.current = null;
    setIsDragging(false);
  };

  // A drag ends with a click on the <Link>; swallow it so releasing the
  // pointer doesn't also navigate to the album.
  const handleLinkClick = (e: React.MouseEvent) => {
    if (draggedRef.current) {
      e.preventDefault();
      draggedRef.current = false;
    }
  };

  // Roughly which sampled frame sits at the left edge of the viewport right
  // now, mapped onto the album's real frame count for the label.
  const currentIndex = Math.min(count - 1, Math.round(offset / FRAME_PX));
  const label =
    offset > 0
      ? `frame ${String(
          Math.round((currentIndex / (count - 1 || 1)) * (frameCount - 1)) + 1
        ).padStart(2, "0")}/${frameCount}`
      : `${frameCount} frame${frameCount === 1 ? "" : "s"}`;

  // Only mount <Photo> for frames near the visible window so pulling the
  // roll doesn't eagerly request every preview image up front.
  const firstVisible = Math.floor(offset / FRAME_PX);
  const lastVisible = Math.ceil((offset + VIEWPORT_PX) / FRAME_PX);
  const renderStart = Math.max(0, firstVisible - RENDER_BUFFER_FRAMES);
  const renderEnd = Math.min(frames.length, lastVisible + RENDER_BUFFER_FRAMES);

  return (
    <Link
      ref={rowRef}
      href={`/album/${albumId}`}
      className="flex items-center no-underline p-[10px] border transition-colors"
      style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      onClick={handleLinkClick}
    >
      <span
        className="relative z-[1] text-[11px] w-11 flex-shrink-0 border px-1 py-1.5 text-center"
        style={{ color: "var(--accent)", borderColor: "var(--border-strong)" }}
      >
        #{String(num).padStart(3, "0")}
        {privado && (
          <span className="ml-1" title="Álbum privado">
            🔒
          </span>
        )}
      </span>

      <Canister />

      {/* Strip pulling out of the canister: dragging translates the reel
          horizontally, revealing more of the album the further it's pulled. */}
      <div
        className="overflow-hidden -ml-1 pl-3 cursor-grab active:cursor-grabbing"
        style={{
          width: Math.min(VIEWPORT_PX, stripWidth),
          background: "var(--strip-bg)",
          touchAction: "pan-y",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex flex-col"
          style={{
            width: stripWidth,
            transform: `translateX(${-offset}px)`,
            transition: isDragging ? "none" : "transform 200ms ease-out",
          }}
        >
          <SprocketRow cols={sprocketCols} />

          <div className="flex">
            {frames.length === 0 ? (
              <div
                className="flex-shrink-0"
                style={{ width: FRAME_PX, height: FRAME_PX, background: "var(--surface-raised)" }}
              />
            ) : (
              frames.map((f, i) => (
                <div
                  key={f.nome}
                  className="relative flex-shrink-0 overflow-hidden"
                  style={{
                    width: FRAME_PX,
                    height: FRAME_PX,
                    borderLeft: "1px solid var(--frame-divider)",
                  }}
                >
                  {/* object-contain, not cover: the strip is an index of the
                      roll, so each frame has to show the whole photo. Albums mix
                      portrait and landscape, so the square cell letterboxes
                      whichever axis is short. */}
                  {i >= renderStart && i < renderEnd && (
                    <Photo
                      imageName={f.nome}
                      descricao=""
                      hash={f.hash}
                      album_id={albumId}
                      width={f.width || FRAME_PX}
                      height={f.height || FRAME_PX}
                      className="object-contain w-full h-full"
                      sizes={`${FRAME_PX}px`}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          <SprocketRow cols={sprocketCols} />
        </div>
      </div>

      <div className="flex-1 text-right pl-4">
        <div className="text-base font-serif-italic">{displayName}</div>
        <div
          className="text-[11px] mt-0.5 tabular-nums"
          style={{ color: "var(--accent)" }}
        >
          {label}
        </div>
      </div>
    </Link>
  );
};

export default RollRow;
