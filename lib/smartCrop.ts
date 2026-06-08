/**
 * Subject-aware square cropping.
 *
 * When a source photo has the subject small or off-center (e.g.
 * full-body shot, distant subject in a wide scene), a blind
 * center-crop loses the subject and keeps the background. By
 * using the alpha channel of a bg-removed PNG to locate the
 * actual subject, we can crop tightly around them with padding,
 * then send THAT to face analysis and the pixel art generator.
 *
 * Server-side only; uses sharp.
 */
import sharp from "sharp";

/**
 * Force a transparent PNG's alpha channel to be fully binary:
 * every pixel is either 100% opaque or 100% transparent, nothing
 * in between. Eliminates the "leak through" zones where the bg
 * removal model was uncertain (low but non-zero alpha values on
 * background pixels). Those zones were letting textured backgrounds
 * partially survive the composite step and getting pixel-arted by
 * rd-fast.
 *
 * Threshold (0-255) chosen at 128: anything BRIA said was at least
 * half-confidently subject becomes fully opaque; anything below
 * becomes fully transparent. Hard edges only.
 */
export async function binarizeAlpha(
  isolatedPngBytes: Buffer,
  threshold = 128
): Promise<Buffer> {
  const { data, info } = await sharp(isolatedPngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels < 4) return isolatedPngBytes; // no alpha to binarize

  const out = Buffer.from(data); // mutable copy
  const pixelCount = width * height;

  for (let i = 0; i < pixelCount; i++) {
    const alphaIdx = i * channels + (channels - 1);
    out[alphaIdx] = out[alphaIdx] >= threshold ? 255 : 0;
  }

  return sharp(out, {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();
}

interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Scan the alpha channel of a transparent PNG to find the smallest
 * rectangle that contains all non-transparent pixels (the subject).
 * Returns null if the image is fully transparent or scanning fails.
 */
export async function findSubjectBbox(
  isolatedPngBytes: Buffer
): Promise<Bbox | null> {
  try {
    const { data, info } = await sharp(isolatedPngBytes)
      .ensureAlpha()
      .extractChannel("alpha")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    const ALPHA_THRESHOLD = 30; // pixels at least this opaque "count"

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (data[row + x] >= ALPHA_THRESHOLD) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) return null; // no opaque pixels

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  } catch {
    return null;
  }
}

/**
 * Crop a source image to a square centered on the subject bbox,
 * with padding (default 20% of subject's largest dimension).
 *
 * Edges of the original image clamp the crop, so for a subject in
 * the bottom-right corner the square just sits flush against that
 * corner instead of going out of bounds.
 *
 * If the subject is bigger than the original frame can accommodate
 * (impossible in practice but defensive), falls back to the
 * largest square that fits.
 */
export async function cropSquareAroundBbox(
  sourceBytes: Buffer,
  bbox: Bbox,
  padPct = 0.35
): Promise<Buffer> {
  const meta = await sharp(sourceBytes).metadata();
  const sw = meta.width ?? 0;
  const sh = meta.height ?? 0;
  if (sw === 0 || sh === 0) return sourceBytes;

  const subjectCenterX = bbox.x + bbox.width / 2;
  const subjectCenterY = bbox.y + bbox.height / 2;

  // Square side = larger subject dim + padding on both sides
  const largestSubjectDim = Math.max(bbox.width, bbox.height);
  const desiredSide = Math.floor(largestSubjectDim * (1 + padPct * 2));

  // Clamp to original image dimensions
  const side = Math.min(desiredSide, sw, sh);

  // Compute crop top-left so the subject sits centered, clamped
  // to image bounds
  let cropX = Math.floor(subjectCenterX - side / 2);
  let cropY = Math.floor(subjectCenterY - side / 2);
  cropX = Math.max(0, Math.min(sw - side, cropX));
  cropY = Math.max(0, Math.min(sh - side, cropY));

  return sharp(sourceBytes)
    .extract({ left: cropX, top: cropY, width: side, height: side })
    .toBuffer();
}

/**
 * Grow a binary alpha mask outward by `radius` pixels (4-neighbor
 * dilation). Used to give the subject mask a little tolerance so it
 * doesn't clip the generated blocky silhouette, which can sit a
 * pixel or two outside the original photo silhouette.
 */
function dilateBinary(
  alpha: Uint8Array | Buffer,
  w: number,
  h: number,
  radius: number
): Uint8Array {
  let cur = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) cur[i] = alpha[i] >= 128 ? 255 : 0;

  for (let r = 0; r < radius; r++) {
    const next = new Uint8Array(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (
          cur[i] === 255 ||
          (x > 0 && cur[i - 1] === 255) ||
          (x < w - 1 && cur[i + 1] === 255) ||
          (y > 0 && cur[i - w] === 255) ||
          (y < h - 1 && cur[i + w] === 255)
        ) {
          next[i] = 255;
        }
      }
    }
    cur = next;
  }
  return cur;
}

/**
 * Force a generated pixel-art PNG's transparency to respect a
 * known-good subject mask. Everything OUTSIDE the (slightly dilated)
 * subject region is made fully transparent; inside, whatever alpha
 * the generator already produced is kept.
 *
 * Why this exists: BRIA and rd-fast's own `remove_bg` are trained on
 * photographs and are unreliable on chunky out-of-distribution pixel
 * art, so they leave background chunks and halos. But we already
 * computed a pixel-perfect subject mask during the FIRST isolation
 * pass on the real photo. Reusing that mask is mechanical and
 * deterministic instead of asking an AI model to re-detect the
 * background it keeps getting wrong.
 *
 * Because rd-fast's remove_bg still handles the tight subject edge
 * INSIDE the region, generous dilation is safe: the mask only acts
 * as a hard backstop against far-away background the generator
 * missed. If remove_bg failed entirely, the mask shape itself
 * becomes the silhouette, so we degrade gracefully.
 *
 * @param targetPng  the generated PNG to clean
 * @param maskSource a transparent PNG whose alpha marks the subject
 * @param dilatePx   pixels (at target resolution) to grow the mask
 */
export async function gateAlphaToMask(
  targetPng: Buffer,
  maskSource: Buffer,
  dilatePx = 2
): Promise<Buffer> {
  const { data, info } = await sharp(targetPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels < 4) return targetPng;

  // Resize the mask's alpha to the target resolution. Nearest keeps
  // the mask binary so the edge stays crisp instead of feathering.
  const maskAlpha = await sharp(maskSource)
    .ensureAlpha()
    .extractChannel("alpha")
    .resize(width, height, { kernel: "nearest" })
    .raw()
    .toBuffer();

  const grown = dilateBinary(maskAlpha, width, height, dilatePx);

  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i++) {
    if (grown[i] < 128) {
      out[i * channels + (channels - 1)] = 0; // outside subject -> clear
    }
  }

  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}
