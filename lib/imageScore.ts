/**
 * Cheap heuristic scoring of generated pixel art so we can pick the
 * best of several candidates and reject obvious failures (grayscale
 * output, etc.) before the user ever sees them.
 *
 * Server-side only; uses sharp. No AI calls - pure pixel math.
 */
import sharp from "sharp";

/**
 * Average HSV saturation across non-transparent pixels (0-1).
 * Grayscale / monochrome outputs score near 0; colorful outputs
 * score higher. Used to reject the occasional black-and-white
 * generation rd-fast produces on a bad seed.
 */
export async function averageSaturation(pngBytes: Buffer): Promise<number> {
  const { data, info } = await sharp(pngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let total = 0;
  let count = 0;

  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const a = channels >= 4 ? data[idx + 3] / 255 : 1;
    if (a < 0.5) continue; // ignore transparent background

    const r = data[idx] / 255;
    const g = data[idx + 1] / 255;
    const b = data[idx + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    total += sat;
    count++;
  }

  return count === 0 ? 0 : total / count;
}

/**
 * Fraction of pixels that are transparent (0-1). Used to sanity-
 * check background removal: a healthy avatar has SOME transparent
 * background (subject doesn't fill 100%) but isn't mostly empty
 * (subject didn't get erased).
 */
export async function transparentRatio(pngBytes: Buffer): Promise<number> {
  const { data, info } = await sharp(pngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels < 4) return 0;

  let transparent = 0;
  const pixelCount = width * height;
  for (let i = 0; i < pixelCount; i++) {
    if (data[i * channels + 3] < 128) transparent++;
  }
  return transparent / pixelCount;
}

/**
 * Horizontal-symmetry score (0-1) over the subject's opaque pixels.
 * A front-facing, mirror-symmetric face scores high; a profile or
 * three-quarter view scores low because one side of the face is
 * foreshortened (eyes at different offsets, lopsided shading, half
 * the silhouette missing its mirror partner).
 *
 * The subject is mirrored about its OWN vertical center axis (the
 * horizontal midpoint of the opaque bounding box), not the image
 * center, so an off-center crop doesn't tank the score. Pure pixel
 * math, no AI. This is what lets selection reject side-facing
 * outputs, which prompt text alone could never reliably do.
 */
export async function frontalityScore(pngBytes: Buffer): Promise<number> {
  const { data, info } = await sharp(pngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const alphaOf = (x: number, y: number) =>
    channels >= 4 ? data[(y * width + x) * channels + 3] : 255;

  // Horizontal extent of the subject (opaque pixels).
  let minX = width;
  let maxX = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaOf(x, y) >= 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  if (maxX < 0) return 0; // no subject at all

  const axis = (minX + maxX) / 2;
  let diffSum = 0;
  let pairs = 0;

  for (let y = 0; y < height; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * width + x) * channels;
      if ((channels >= 4 ? data[idx + 3] : 255) < 128) continue;

      const mx = Math.round(2 * axis - x);
      if (mx < 0 || mx >= width || alphaOf(mx, y) < 128) {
        // Subject pixel whose mirror partner is off-frame or
        // transparent: a silhouette asymmetry. Count as a full
        // mismatch so lopsided (side-facing) subjects are penalized.
        diffSum += 1;
        pairs++;
        continue;
      }
      const midx = (y * width + mx) * channels;
      const dr = Math.abs(data[idx] - data[midx]);
      const dg = Math.abs(data[idx + 1] - data[midx + 1]);
      const db = Math.abs(data[idx + 2] - data[midx + 2]);
      diffSum += (dr + dg + db) / 765; // 0..1 per mirrored pair
      pairs++;
    }
  }

  return pairs === 0 ? 0 : 1 - diffSum / pairs;
}

/**
 * Combined quality score for a candidate avatar (higher = better).
 * Rewards color richness and front-facing symmetry, penalizes
 * outputs where the subject was erased (too transparent) or the
 * background wasn't removed (too opaque).
 */
export async function scoreCandidate(pngBytes: Buffer): Promise<number> {
  const [sat, transp, frontality] = await Promise.all([
    averageSaturation(pngBytes),
    transparentRatio(pngBytes),
    frontalityScore(pngBytes),
  ]);

  // Saturation is the baseline signal (0-1). A grayscale gen lands
  // near 0 and loses to any colorful sibling.
  let score = sat;

  // Frontality is weighted heavily: a side / profile output is a hard
  // failure for an avatar, so a symmetric front-facing candidate
  // should beat a sideways one even when it's marginally less
  // saturated. (0.5 weight chosen so the typical front-vs-side gap
  // outweighs the typical saturation gap between two color outputs.)
  score += frontality * 0.5;

  // Mild bonus for a healthy transparent ratio (15%-75% of the
  // frame transparent = subject framed with clean removed bg).
  // Penalize the extremes: ~0% transparent means bg wasn't removed;
  // >85% transparent means the subject got erased.
  if (transp >= 0.15 && transp <= 0.75) {
    score += 0.15;
  } else if (transp < 0.05 || transp > 0.85) {
    score -= 0.25;
  }

  return score;
}
