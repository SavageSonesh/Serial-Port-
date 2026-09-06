import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Layout } from './layout';
import type { Fonts } from './fonts';
import type { LogoAsset } from './logo';
import { logoGrayscalePng } from './logo';

const MM_TO_PT = 72 / 25.4;

/**
 * Renders the layout to a single A4 PDF page with embedded (subset) fonts and
 * selectable text. Positions come straight from the layout engine.
 */
export async function renderPdf(layout: Layout, fonts: Fonts, logo: LogoAsset, title: string): Promise<Uint8Array> {
  if (layout.overflow) throw new Error('O menu não cabe numa página A4. Corrija antes de exportar.');
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  doc.setProducer('O Satélite · Menu do dia');
  doc.setCreator('O Satélite · Menu do dia');
  const regular = await doc.embedFont(fonts.regular.bytes, { subset: true });
  const bold = await doc.embedFont(fonts.bold.bytes, { subset: true });
  const pageW = layout.page.width * MM_TO_PT;
  const pageH = layout.page.height * MM_TO_PT;
  const page = doc.addPage([pageW, pageH]);
  const ink = rgb(0.067, 0.067, 0.067);

  // Set each font once and draw its runs together (keeps the page resources tidy).
  for (const weight of ['regular', 'bold'] as const) {
    page.setFont(weight === 'bold' ? bold : regular);
    for (const t of layout.texts.filter((r) => r.weight === weight)) {
      page.drawText(t.text, { x: t.x * MM_TO_PT, y: pageH - t.y * MM_TO_PT, size: t.sizePt, color: ink });
    }
  }

  const pngBytes = layout.logo.grayscale ? await logoGrayscalePng(logo) : logo.bytes;
  const png = await doc.embedPng(pngBytes);
  page.drawImage(png, {
    x: layout.logo.x * MM_TO_PT,
    y: pageH - (layout.logo.y + layout.logo.height) * MM_TO_PT,
    width: layout.logo.width * MM_TO_PT,
    height: layout.logo.height * MM_TO_PT,
  });

  return doc.save();
}
