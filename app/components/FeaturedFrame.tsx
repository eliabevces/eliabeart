"use client";
import React from "react";
import Photo from "@components/Photo";
import { random_strip, RandomStrip } from "@lib/api-client";

const CYCLE_MS = 5000;
const SPROCKETS = Array.from({ length: 20 });
const STRIP_HEIGHT = 220;
const GAP = 4;

// Enough neighbours to overflow the strip at any hero width; the row is clipped,
// so the film simply runs off both edges.
const RADIUS = 4;

// Every frame is as wide as its own photo at strip height — like a real contact
// strip, where each frame holds the whole image. Fixed-width slots would crop
// whichever axis didn't fit. So distance only fades neighbours, never resizes.
const frameWidth = (w: number | null, h: number | null) =>
  STRIP_HEIGHT * ((w || 3) / (h || 2));

const fadeFor = (distance: number) =>
  distance === 0 ? 1 : Math.max(0.15, 0.85 - distance * 0.15);

const SprocketRow: React.FC = () => (
  <div className="flex justify-between px-1">
    {SPROCKETS.map((_, i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 flex-shrink-0"
        style={{ borderRadius: 1, background: "var(--sprocket)" }}
      />
    ))}
  </div>
);

const FeaturedFrame: React.FC = () => {
  const [strip, setStrip] = React.useState<RandomStrip | null>(null);

  const fetchNext = React.useCallback(() => {
    random_strip(RADIUS).then((next) => {
      if (next?.frames?.length) setStrip(next);
    });
  }, []);

  React.useEffect(() => {
    fetchNext();
    const interval = setInterval(fetchNext, CYCLE_MS);
    return () => clearInterval(interval);
  }, [fetchNext]);

  // Distance from the row's start to the middle of the featured frame.
  const anchor = React.useMemo(() => {
    if (!strip) return 0;
    const before = strip.frames
      .slice(0, strip.featuredIndex)
      .reduce((sum, f) => sum + frameWidth(f.width, f.height) + GAP, 0);
    const self = strip.frames[strip.featuredIndex];
    return before + frameWidth(self.width, self.height) / 2;
  }, [strip]);

  return (
    <div
      className="relative w-full mb-[26px] overflow-hidden"
      style={{
        background: "var(--hero-strip-bg)",
        borderRadius: 2,
        padding: "8px 10px",
      }}
    >
      <SprocketRow />

      {/* Frames have their own widths, so centring the row would leave the
          featured frame off-centre. Anchor it instead: pin the row at the
          midpoint and pull it back by the featured frame's own centre, which
          is known from the metadata without measuring the DOM. */}
      <div
        className="relative my-1.5 overflow-hidden"
        style={{ height: STRIP_HEIGHT }}
      >
        <div
          className="absolute top-0 flex items-center h-full"
          style={{ left: "50%", transform: `translateX(-${anchor}px)`, gap: GAP }}
        >
          {strip?.frames.map((f, i) => {
            const distance = Math.abs(i - strip.featuredIndex);
            const featured = distance === 0;

            return (
              <div
                key={`${f.album_id}-${f.nome}`}
                className="relative h-full overflow-hidden flex-shrink-0"
                style={{
                  width: frameWidth(f.width, f.height),
                  opacity: fadeFor(distance),
                  ...(featured
                    ? { border: "2px solid var(--accent)" }
                    : {
                        [i < strip.featuredIndex
                          ? "borderRight"
                          : "borderLeft"]: "1px solid var(--frame-divider)",
                      }),
                }}
              >
                {/* The slot matches the photo's aspect, so cover fills it
                    without cropping anything. */}
                <Photo
                  imageName={f.nome}
                  descricao={f.descricao || ""}
                  hash={f.hash}
                  album_id={f.album_id}
                  width={f.width || 0}
                  height={f.height || 0}
                  className="w-full h-full object-cover"
                  sizes={featured ? "700px" : "400px"}
                  priority={featured}
                />
              </div>
            );
          })}
        </div>
      </div>

      <SprocketRow />
    </div>
  );
};

export default FeaturedFrame;
