/**
 * Client-Side Image Compression & Thumbnail Generation
 * - Generates lightweight thumbnails (~15KB) for instant gallery rendering
 * - Provides Smart Optimization or Original Uncompressed file reading
 */

export interface ProcessedFileResult {
  dataUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  fileType: string;
  isUncompressed: boolean;
}

/**
 * Creates an ultra-lightweight thumbnail (~15-25KB) from any image Data URL.
 */
export async function generateThumbnail(
  fileDataUrl: string,
  maxDimension: number = 320,
  quality: number = 0.65
): Promise<string | undefined> {
  if (!fileDataUrl.startsWith('data:image/')) {
    return undefined;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(undefined);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Try webp first, fall back to jpeg
        try {
          const thumb = canvas.toDataURL('image/webp', quality);
          resolve(thumb);
        } catch {
          const thumb = canvas.toDataURL('image/jpeg', quality);
          resolve(thumb);
        }
      };

      img.onerror = () => resolve(undefined);
      img.src = fileDataUrl;
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Reads a File object with user-selected compression options.
 */
export async function processFileForVault(
  file: File,
  isUncompressed: boolean = false
): Promise<ProcessedFileResult> {
  const isImage = file.type.startsWith('image/') && !file.type.includes('svg');

  // If user selected uncompressed or file is not an image (e.g. PDF, DOCX), read raw bytes
  if (isUncompressed || !isImage) {
    const rawDataUrl = await readFileAsDataUrl(file);
    const thumbnail = isImage ? await generateThumbnail(rawDataUrl) : undefined;

    return {
      dataUrl: rawDataUrl,
      thumbnailUrl: thumbnail,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      isUncompressed: true,
    };
  }

  // Smart Optimization for images:
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const srcDataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = async () => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback to raw if canvas fails
          const thumb = await generateThumbnail(srcDataUrl);
          resolve({
            dataUrl: srcDataUrl,
            thumbnailUrl: thumb,
            fileSize: file.size,
            fileType: file.type,
            isUncompressed: false,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let optimizedDataUrl: string;
        let finalType = 'image/jpeg';
        try {
          optimizedDataUrl = canvas.toDataURL('image/webp', 0.85);
          finalType = 'image/webp';
        } catch {
          optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        // Calculate approximate byte size of base64
        const stringLength = optimizedDataUrl.length - 'data:image/webp;base64,'.length;
        const sizeInBytes = Math.round((stringLength * 3) / 4);

        const thumbnail = await generateThumbnail(optimizedDataUrl);

        resolve({
          dataUrl: optimizedDataUrl,
          thumbnailUrl: thumbnail,
          fileSize: sizeInBytes,
          fileType: finalType,
          isUncompressed: false,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for processing'));
      };

      img.src = srcDataUrl;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as Data URL'));
    reader.readAsDataURL(file);
  });
}
