import sharp from "sharp";

/** Largest raw upload we will even try to decode (before optimization). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

/** Product photos are displayed at most a few hundred px wide; 1200 is ample. */
const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/tiff",
  "image/heic",
  "image/heif",
];

export interface OptimizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Normalize an uploaded photo into a small, web-ready WebP:
 * fixes EXIF rotation, caps the long edge at 1200px (never upscales),
 * flattens onto white so transparent PNGs don't render as black, and drops
 * all metadata. A 4 MB phone photo typically lands under 150 KB.
 */
export async function optimizeProductImage(input: Buffer): Promise<OptimizedImage> {
  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    bytes: info.size,
  };
}
