/**
 * Client-side image downscale via Canvas.
 *
 * iPhone photos run 4032x3024 (~5MB) but rd-fast outputs at 384px max,
 * so feeding it anything above ~1024px on the long edge is wasted bytes.
 * Resizing on the client cuts upload time, base64 transfer, and Replicate
 * decode time substantially. Typical 5MB photo -> ~250KB.
 */

const MAX_DIM = 1024;
const JPEG_QUALITY = 0.9;

export async function downscaleImage(file: File): Promise<File> {
  // No-op for tiny images (don't waste time round-tripping through canvas).
  if (file.size < 512 * 1024) return file;

  const bitmap = await loadBitmap(file);
  const { w, h } = fitTo(bitmap.width, bitmap.height, MAX_DIM);

  // Already small enough? Don't bother.
  if (w >= bitmap.width && h >= bitmap.height) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return file;

  // Preserve original filename but switch extension to jpg
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // ImageBitmap is faster and respects EXIF orientation in modern browsers.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      // Fall through to HTMLImageElement path
    }
  }
  return new Promise<ImageBitmap>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Wrap an HTMLImageElement as a pseudo ImageBitmap by drawing through it.
      // Canvas.drawImage accepts HTMLImageElement, so we cast.
      resolve(img as unknown as ImageBitmap);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function fitTo(
  width: number,
  height: number,
  maxLongEdge: number
): { w: number; h: number } {
  if (width <= maxLongEdge && height <= maxLongEdge) {
    return { w: width, h: height };
  }
  if (width >= height) {
    return {
      w: maxLongEdge,
      h: Math.round((maxLongEdge * height) / width),
    };
  }
  return {
    w: Math.round((maxLongEdge * width) / height),
    h: maxLongEdge,
  };
}
