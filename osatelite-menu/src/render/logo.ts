export const LOGO_PATH = 'brand/logo.png';

export interface LogoAsset {
  /** Original PNG bytes, embedded untouched in the PDF. */
  bytes: ArrayBuffer;
  width: number;
  height: number;
  image: HTMLImageElement;
  url: string;
}

let cached: Promise<LogoAsset> | null = null;

/** Loads the bundled logo once and waits until it is fully decoded. */
export function loadLogo(): Promise<LogoAsset> {
  if (!cached) {
    cached = (async () => {
      const url = `${import.meta.env.BASE_URL}${LOGO_PATH}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Não foi possível carregar o logótipo.');
      const bytes = await res.arrayBuffer();
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      const image = new Image();
      image.src = blobUrl;
      await image.decode();
      return { bytes, width: image.naturalWidth, height: image.naturalHeight, image, url: blobUrl };
    })().catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}

/** Returns PNG bytes of the logo converted to greyscale (only used when the setting is on). */
export async function logoGrayscalePng(logo: LogoAsset): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = logo.width;
  canvas.height = logo.height;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(logo.image, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('Falha ao converter o logótipo.');
  return blob.arrayBuffer();
}
