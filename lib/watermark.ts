/**
 * Server-side image processing using sharp.
 * - upscalePixelArt: nearest-neighbor upscale for crisp pixel edges
 * - watermarkPng: diagonal repeating wordmark baked into the PNG
 */
import sharp from "sharp";

/**
 * Quantize a PNG down to a fixed palette of N colors.
 * Removes fuzzy gradients and forces flat color regions that read
 * as authentic pixel art. Run BEFORE upscaling so each output color
 * region is one solid block instead of a smoothed transition.
 */
export async function quantizePalette(
  input: Buffer,
  colors = 16
): Promise<Buffer> {
  return sharp(input)
    .png({ palette: true, colors, dither: 1.0 })
    .toBuffer();
}

/**
 * Flatten a transparent PNG onto a solid background color.
 * Used to bake in the user's chosen background color before delivery.
 */
export async function flattenWithBackground(
  input: Buffer,
  hexColor: string
): Promise<Buffer> {
  // Accepts #rrggbb or named colors; default to white if it can't parse.
  return sharp(input)
    .flatten({ background: hexColor })
    .png()
    .toBuffer();
}

/**
 * Upscale a small pixel art PNG using nearest-neighbor interpolation.
 * Generation at 64 then 12x upscale = 768px with very crisp visible
 * pixels, matching authentic 90s sprite art.
 */
export async function upscalePixelArt(
  input: Buffer,
  targetLongEdge = 768
): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 64;
  const h = meta.height ?? 64;
  const longEdge = Math.max(w, h);
  if (longEdge >= targetLongEdge) return input;

  const scale = targetLongEdge / longEdge;
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  return sharp(input)
    .resize(newW, newH, { kernel: "nearest" })
    .png()
    .toBuffer();
}

/**
 * Hand-rolled 5x7 pixel font for the watermark text.
 * Each letter is a string array (one row per string, "X" = filled cell).
 * Rendering uses SVG rects only - NO font files involved - so it produces
 * identical output everywhere regardless of system fonts. This is the
 * reliable fix for the missing-font glyph-rectangle issue we hit with
 * both SVG <text> and Sharp's Pango-backed text input on Vercel.
 */
const PIXEL_FONT_5X7: Record<string, string[]> = {
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  D: ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  H: ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  I: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"],
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  M: ["X...X", "XX.XX", "X.X.X", "X...X", "X...X", "X...X", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
  T: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
  W: ["X...X", "X...X", "X...X", "X...X", "X.X.X", "XX.XX", ".X.X."],
  X: ["X...X", ".X.X.", "..X..", "..X..", "..X..", ".X.X.", "X...X"],
  C: [".XXX.", "X...X", "X....", "X....", "X....", "X...X", ".XXX."],
  V: ["X...X", "X...X", "X...X", "X...X", ".X.X.", ".X.X.", "..X.."],
  ".": [".....", ".....", ".....", ".....", ".....", "..X..", "..X.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

function buildPixelTextSvg(
  text: string,
  cellSize: number
): { svg: string; width: number; height: number } {
  const LETTER_W = 5;
  const LETTER_H = 7;
  const GAP = 1; // 1 cell gap between letters

  const rects: string[] = [];
  let cursorX = 0;

  for (const ch of text.toUpperCase()) {
    const bitmap = PIXEL_FONT_5X7[ch];
    if (!bitmap) {
      // Unknown char becomes a space-width gap
      cursorX += (LETTER_W + GAP) * cellSize;
      continue;
    }
    for (let r = 0; r < LETTER_H; r++) {
      const row = bitmap[r];
      for (let c = 0; c < LETTER_W; c++) {
        if (row[c] === "X") {
          rects.push(
            `<rect x="${cursorX + c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}"/>`
          );
        }
      }
    }
    cursorX += (LETTER_W + GAP) * cellSize;
  }

  const totalWidth = cursorX - GAP * cellSize; // strip trailing gap
  const totalHeight = LETTER_H * cellSize;

  // Each filled cell is white with a thin black stroke - visible on any
  // background color the user might pick.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" shape-rendering="crispEdges">
    <g fill="white" fill-opacity="0.78" stroke="black" stroke-opacity="0.55" stroke-width="1">
      ${rects.join("")}
    </g>
  </svg>`;

  return { svg, width: totalWidth, height: totalHeight };
}

const WATERMARK_TEXT = "MADE WITH PIXELARTAVATAR.COM";

export async function watermarkPng(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  // Cell size scales with image. The longer brand text (~27 chars)
  // needs smaller cells to fit at a -25 degree rotation. On a 768x768
  // avatar this yields a 4-5px cell, with the text running ~644-810px
  // wide before rotation (fits diagonally across the image).
  const cellSize = Math.max(3, Math.floor(Math.min(w, h) / 160));

  const { svg } = buildPixelTextSvg(WATERMARK_TEXT, cellSize);

  const stampPng = await sharp(Buffer.from(svg)).png().toBuffer();

  // Rotate -25 degrees with transparent corners so it sits diagonal
  // across the avatar.
  const rotated = await sharp(stampPng)
    .rotate(-25, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rotMeta = await sharp(rotated).metadata();
  const rw = rotMeta.width ?? 0;
  const rh = rotMeta.height ?? 0;

  // Two diagonal stamps spaced vertically. The text is long enough to
  // span the image diagonally; two stamps give protection across the
  // top and bottom halves without heavy overlap (cropping one out
  // would mean trimming too much of the avatar to be usable as a
  // profile pic).
  const centerX = Math.floor((w - rw) / 2);
  const stamps = 2;
  const slotHeight = h / (stamps + 1);

  const composites = Array.from({ length: stamps }, (_, i) => ({
    input: rotated,
    top: Math.floor((i + 1) * slotHeight - rh / 2),
    left: centerX,
    blend: "over" as const,
  }));

  return sharp(input).composite(composites).png().toBuffer();
}
