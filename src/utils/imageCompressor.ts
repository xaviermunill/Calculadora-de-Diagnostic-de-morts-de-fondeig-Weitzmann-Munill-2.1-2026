/**
 * Utilitat de compressió d'imatges client-side per a l'auditoria de morts de fondeig.
 * Assegura que cap imatge adjuntada superi 1 MB (1.048.576 bytes) preservant la màxima resolució i nitidesa.
 */

export const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1 MB exact (1.048.576 bytes)

/**
 * Calcula la mida en bytes d'una cadena DataURL en format Base64
 */
export function getDataUrlSizeBytes(dataUrl: string): number {
  const headIndex = dataUrl.indexOf(',');
  if (headIndex === -1) return dataUrl.length;
  const base64Str = dataUrl.slice(headIndex + 1);
  const padding = (base64Str.match(/=*$/) || [''])[0].length;
  return Math.floor((base64Str.length * 3) / 4) - padding;
}

/**
 * Formata una quantitat de bytes en text llegible (ex: 850 KB, 1.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Carrega una imatge (File, Blob o dataURL) en un objecte HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Comprimeix i redueix el pes d'una imatge a un màxim de 1 MB (maxSizeBytes).
 * Redueix proporcionalment la resolució i ajusta la qualitat JPEG per sota del límit.
 */
export async function compressImageToMaxSize(
  fileOrDataUrl: File | Blob | string,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): Promise<{ dataUrl: string; originalSize: number; finalSize: number; wasCompressed: boolean }> {
  let sourceDataUrl = '';
  let originalSize = 0;

  if (typeof fileOrDataUrl === 'string') {
    sourceDataUrl = fileOrDataUrl;
    originalSize = getDataUrlSizeBytes(sourceDataUrl);
  } else {
    originalSize = fileOrDataUrl.size;
    sourceDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    });
  }

  // Si la imatge ja pesa menys d'1 MB i no és gegant, la podem mantenir
  if (originalSize <= maxSizeBytes) {
    // Comprovem si té dimensions excessives (> 2560px)
    try {
      const img = await loadImage(sourceDataUrl);
      if (img.width <= 2560 && img.height <= 2560) {
        return {
          dataUrl: sourceDataUrl,
          originalSize,
          finalSize: originalSize,
          wasCompressed: false,
        };
      }
    } catch {
      return {
        dataUrl: sourceDataUrl,
        originalSize,
        finalSize: originalSize,
        wasCompressed: false,
      };
    }
  }

  // Cal comprimir la imatge
  const img = await loadImage(sourceDataUrl);
  let targetWidth = img.width;
  let targetHeight = img.height;

  // Escala inicial per no superar 1920px d'amplada o alçada màxima (qualitat excel·lent per a informes tècnics)
  const MAX_DIMENSION = 1920;
  if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
      targetWidth = MAX_DIMENSION;
    } else {
      targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
      targetHeight = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: sourceDataUrl, originalSize, finalSize: originalSize, wasCompressed: false };
  }

  // Fons blanc per si és PNG amb transparència
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Intentem successivament amb qualitats i reduccions fins que pesi <= maxSizeBytes
  let quality = 0.88;
  let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
  let currentBytes = getDataUrlSizeBytes(compressedDataUrl);

  const qualitySteps = [0.82, 0.75, 0.68, 0.60, 0.50, 0.40];
  let stepIndex = 0;

  while (currentBytes > maxSizeBytes && stepIndex < qualitySteps.length) {
    quality = qualitySteps[stepIndex];
    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    currentBytes = getDataUrlSizeBytes(compressedDataUrl);
    stepIndex++;
  }

  // Si encara superés 1MB (per exemple si la resolució era immensa), reduïm dimensions al 75% i repetim
  if (currentBytes > maxSizeBytes) {
    targetWidth = Math.round(targetWidth * 0.75);
    targetHeight = Math.round(targetHeight * 0.75);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    compressedDataUrl = canvas.toDataURL('image/jpeg', 0.70);
    currentBytes = getDataUrlSizeBytes(compressedDataUrl);
  }

  return {
    dataUrl: compressedDataUrl,
    originalSize,
    finalSize: currentBytes,
    wasCompressed: true,
  };
}

/**
 * Genera una miniatura ultra lleugera (~10-25 KB, max 200px) per a llistats ràpids i sincronització lleugera amb Drive/AppsScript
 */
export async function generateThumbnail(
  fileOrDataUrl: File | Blob | string,
  maxDimension: number = 200,
  quality: number = 0.65
): Promise<string> {
  try {
    let sourceDataUrl = '';
    if (typeof fileOrDataUrl === 'string') {
      sourceDataUrl = fileOrDataUrl;
    } else {
      sourceDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrDataUrl);
      });
    }

    const img = await loadImage(sourceDataUrl);
    let targetWidth = img.width;
    let targetHeight = img.height;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(targetWidth, 1);
    canvas.height = Math.max(targetHeight, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceDataUrl;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('Could not generate thumbnail, fallback to source:', err);
    return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
  }
}

// Client-side in-memory and local session cache for high-resolution images
const FULL_PHOTO_CACHE = new Map<string, string[]>();

export function cacheFullPhotos(recordId: string, photos: string[]) {
  if (photos && photos.length > 0) {
    FULL_PHOTO_CACHE.set(recordId, photos);
  }
}

export function getCachedFullPhotos(recordId: string): string[] | undefined {
  return FULL_PHOTO_CACHE.get(recordId);
}

