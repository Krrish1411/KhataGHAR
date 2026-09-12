// Dynamic Client-Side Attachment Compressor for KhataGHAR
// Preserves original files <= 500KB; dynamically compresses images > 500KB via HTML5 Canvas.

export interface ProcessedAttachment {
  dataUrl: string;
  originalSize: number;
  finalSize: number;
  wasCompressed: boolean;
  fileName: string;
  mimeType: string;
  type: 'image' | 'pdf' | 'document';
  message: string;
}

const MAX_UNCOMPRESSED_BYTES = 500 * 1024; // 500 KB dynamic threshold
const MAX_DIMENSION = 1600; // Max width or height in pixels for downscaling
const COMPRESSION_QUALITY = 0.82; // Balanced crispness and file size

export async function processAttachmentFile(file: File): Promise<ProcessedAttachment> {
  const originalSize = file.size;
  const fileName = file.name;
  const mimeType = file.type || 'application/octet-stream';
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const type: 'image' | 'pdf' | 'document' = isImage ? 'image' : isPdf ? 'pdf' : 'document';

  // Rule 1: If file is already <= 500KB, DO NOT compress it. Keep original.
  if (originalSize <= MAX_UNCOMPRESSED_BYTES || !isImage) {
    const dataUrl = await readFileAsDataURL(file);
    const sizeKb = (originalSize / 1024).toFixed(0);
    const message = originalSize <= MAX_UNCOMPRESSED_BYTES
      ? `File size is ${sizeKb} KB (under 500 KB limit, kept original without compression)`
      : `Document attached as original (${sizeKb} KB)`;

    return {
      dataUrl,
      originalSize,
      finalSize: originalSize,
      wasCompressed: false,
      fileName,
      mimeType,
      type,
      message,
    };
  }

  // Rule 2: If image is > 500KB, dynamically compress via HTML5 canvas
  try {
    const rawDataUrl = await readFileAsDataURL(file);
    const compressedDataUrl = await compressImage(rawDataUrl, mimeType);

    // Approximate size in bytes from base64 string
    const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
    const finalSize = Math.round((base64Length * 3) / 4);

    const origMb = (originalSize / (1024 * 1024)).toFixed(1);
    const finalKb = (finalSize / 1024).toFixed(0);
    const message = `Image optimized from ${origMb} MB to ${finalKb} KB for fast encrypted storage`;

    return {
      dataUrl: compressedDataUrl,
      originalSize,
      finalSize,
      wasCompressed: true,
      fileName,
      mimeType: compressedDataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg',
      type: 'image',
      message,
    };
  } catch (err) {
    console.warn('Image compression fallback to original:', err);
    const dataUrl = await readFileAsDataURL(file);
    return {
      dataUrl,
      originalSize,
      finalSize: originalSize,
      wasCompressed: false,
      fileName,
      mimeType,
      type: 'image',
      message: `Image attached as original (${(originalSize / 1024).toFixed(0)} KB)`,
    };
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, originalMime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down proportionally if larger than MAX_DIMENSION
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer modern WebP if supported, fallback to JPEG
      const outputMime = 'image/webp';
      let result = canvas.toDataURL(outputMime, COMPRESSION_QUALITY);
      if (!result.startsWith('data:image/webp')) {
        result = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
      }

      resolve(result);
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}
