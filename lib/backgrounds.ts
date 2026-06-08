/**
 * Server-only background renderers. This module uses sharp; never
 * import it from a client component. The client-safe constants and
 * CSS helper live in lib/backgroundBands.ts.
 */
import sharp from "sharp";
import {
  BEACH_BANDS,
  STUDIO_GRADIENT,
  type Band,
} from "./backgroundBands";

export { BEACH_BANDS, STUDIO_GRADIENT };
export type { Band };

/**
 * Render the Studio radial gradient as a PNG. Used at download time
 * to composite the user's avatar over the soft photo-studio backdrop.
 */
export async function renderStudioBuffer(
  width: number,
  height: number
): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="studio" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${STUDIO_GRADIENT.centerColor}"/>
        <stop offset="100%" stop-color="${STUDIO_GRADIENT.edgeColor}"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#studio)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Render the bands as a PNG at the given dimensions. Used at
 * download time to composite the user's avatar over the scene.
 */
export async function renderBandsBuffer(
  width: number,
  height: number,
  bands: Band[] = BEACH_BANDS
): Promise<Buffer> {
  const rects = bands
    .map((b, i) => {
      const prev = i === 0 ? 0 : bands[i - 1].end;
      const y = Math.round((prev / 100) * height);
      const next = Math.round((b.end / 100) * height);
      const h = next - y;
      return `<rect x="0" y="${y}" width="${width}" height="${h}" fill="${b.color}"/>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" shape-rendering="crispEdges">${rects}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
