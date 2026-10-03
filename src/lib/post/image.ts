// Browser-only helpers for getting a photo from the phone to storage.

export class UnreadableImageError extends Error {
  constructor() {
    super('This photo could not be read. Try a JPEG, or take the photo again.');
    this.name = 'UnreadableImageError';
  }
}

// Matches the API's MaxEdge. Anything larger is thrown away on the server
// anyway, so sending it would only spend the host's data.
const MAX_EDGE = 2048;
const QUALITY = 0.85;

// prepareImage shrinks a photo in the browser before it is uploaded.
//
// A phone camera shot is typically 3 to 6 MB. Shrunk to the size the server
// keeps, it is well under 1 MB: five photos cost the host a fraction of the
// data, and each upload is several times less likely to fail halfway.
//
// Drawing to a canvas and re-encoding also drops the photo's metadata, so the
// GPS coordinates a phone writes into every picture never leave the device.
// The server strips them too; this means they are never even transmitted.
//
// imageOrientation 'from-image' applies the rotation the camera recorded,
// otherwise portrait photos from many Android phones arrive sideways.
export async function prepareImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UnreadableImageError();
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new UnreadableImageError();
  }
  context.drawImage(bitmap, 0, 0, width, height);
  // A decoded 12 megapixel photo holds about 48 MB. Released at once, because
  // a low-end phone holding several of those is a phone that kills the tab.
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new UnreadableImageError())), 'image/jpeg', QUALITY),
  );
}

// putWithProgress uploads straight to storage with a presigned URL.
//
// XMLHttpRequest rather than fetch, because fetch still cannot report upload
// progress, and a progress bar is what tells someone on a slow connection that
// the app has not frozen.
//
// The headers must be exactly those the API returned: the URL's signature
// covers them, and any difference is a 403 from storage.
export function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload was refused (${xhr.status}).`));
    // A CORS rejection also lands here, indistinguishable from being offline.
    // If every upload fails this way on a good connection, check the bucket's
    // CORS rule before anything else.
    xhr.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('The upload took too long. Try again on a stronger connection.'));
    xhr.send(body);
  });
}
