/**
 * Background scene definitions. Client-safe (no sharp import).
 * The server side in lib/backgrounds.ts uses these to render PNG
 * buffers; the browser uses bandsToCssGradient() for the live preview.
 */

interface Band {
  color: string;
  /** Cumulative end percentage (0-100). */
  end: number;
}

export const BEACH_BANDS: Band[] = [
  // Sunset sky, top to horizon
  { color: "#c44b3c", end: 7 },
  { color: "#d65b3a", end: 14 },
  { color: "#e76f37", end: 22 },
  { color: "#ed8338", end: 30 },
  { color: "#f29844", end: 38 },
  { color: "#f5b14e", end: 46 },
  { color: "#f9c759", end: 53 },
  // Bright horizon line
  { color: "#fde047", end: 58 },
  // Sand, horizon down to foreground
  { color: "#fef3c7", end: 70 },
  { color: "#fae8b3", end: 80 },
  { color: "#f5dba2", end: 90 },
  { color: "#ecc885", end: 100 },
];

export type { Band };

/**
 * Build a CSS linear-gradient string matching the given bands.
 * Hard color stops (`color start% end%`) produce the chunky banding
 * look instead of smooth blending.
 */
export function bandsToCssGradient(bands: Band[] = BEACH_BANDS): string {
  let prev = 0;
  const stops = bands.map((b) => {
    const stop = `${b.color} ${prev}% ${b.end}%`;
    prev = b.end;
    return stop;
  });
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

/**
 * Studio: a soft pale radial gradient that matches the look the AI
 * was naturally producing before remove_bg was enabled. Soft pale
 * cream center fading to slightly darker beige at the edges -
 * subtle photo-studio vignette.
 */
export const STUDIO_GRADIENT = {
  centerColor: "#f1ebe2",
  edgeColor: "#d6cdc1",
};

export function studioCss(): string {
  return `radial-gradient(ellipse at center, ${STUDIO_GRADIENT.centerColor} 0%, ${STUDIO_GRADIENT.edgeColor} 100%)`;
}
