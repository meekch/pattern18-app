import sharp from 'sharp';

export const SANITIZABLE_IMAGE_TYPES = /^image\/(jpeg|jpg|png|webp|tiff|gif|avif|heic|heif)$/i;

export function isSanitizableImage(mimeType: string | null | undefined): boolean {
  return !!mimeType && SANITIZABLE_IMAGE_TYPES.test(mimeType);
}

export type SanitizedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

/**
 * Re-encodes an image through sharp so no EXIF, GPS, ICC, XMP or IPTC block
 * survives into storage. sharp drops all metadata unless withMetadata() is
 * called, so the re-encode itself is what strips it.
 *
 * rotate() is applied first: EXIF orientation is metadata, so discarding it
 * without baking it into the pixels would leave some phone photos sideways.
 *
 * Format is preserved rather than normalised to JPEG — these are evidence
 * screenshots, and lossy recompression of screenshot text hurts legibility.
 */
export async function stripImageMetadata(input: Buffer): Promise<SanitizedImage> {
  const pipeline = sharp(input, { failOn: 'none', animated: false }).rotate();
  const { format } = await sharp(input, { failOn: 'none' }).metadata();

  switch (format) {
    case 'jpeg':
      return {
        buffer: await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer(),
        contentType: 'image/jpeg',
        extension: 'jpg',
      };
    case 'webp':
      return {
        buffer: await pipeline.webp({ quality: 90 }).toBuffer(),
        contentType: 'image/webp',
        extension: 'webp',
      };
    default:
      // png, tiff, gif, avif, heic and anything sharp could decode but we do
      // not want to keep in its original container.
      return {
        buffer: await pipeline.png({ compressionLevel: 9 }).toBuffer(),
        contentType: 'image/png',
        extension: 'png',
      };
  }
}
