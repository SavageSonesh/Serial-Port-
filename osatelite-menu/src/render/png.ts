import type { Layout } from './layout';
import { FONT_FAMILY } from './fonts';
import type { LogoAsset } from './logo';
import { PT_TO_MM } from './template';

export const PNG_WIDTH = 2480;
export const PNG_HEIGHT = 3508;

/** Renders the layout to a 2480×3508 (300 dpi A4) PNG on a pure white background. */
export async function renderPng(layout: Layout, logo: LogoAsset): Promise<Blob> {
  if (layout.overflow) throw new Error('O menu não cabe numa página A4. Corrija antes de exportar.');
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = PNG_WIDTH;
  canvas.height = PNG_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas não disponível.');
  const scale = PNG_WIDTH / layout.page.width; // px per mm
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PNG_WIDTH, PNG_HEIGHT);
  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (const t of layout.texts) {
    const px = t.sizePt * PT_TO_MM * scale;
    ctx.font = `${t.weight === 'bold' ? '700' : '400'} ${px}px ${FONT_FAMILY}`;
    ctx.fillText(t.text, t.x * scale, t.y * scale);
  }
  ctx.filter = layout.logo.grayscale ? 'grayscale(1)' : 'none';
  ctx.drawImage(logo.image, layout.logo.x * scale, layout.logo.y * scale, layout.logo.width * scale, layout.logo.height * scale);
  ctx.filter = 'none';
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('Falha ao gerar PNG.');
  return blob;
}
