import opentype, { type Font } from 'opentype.js';
import { PT_TO_MM } from './template';

export type Weight = 'regular' | 'bold';

export interface LoadedFont {
  weight: Weight;
  bytes: ArrayBuffer;
  font: Font;
}

export interface Fonts {
  regular: LoadedFont;
  bold: LoadedFont;
  /** Width of `text` in millimetres at `sizePt`, using the font's own metrics (kerning on). */
  measure(text: string, sizePt: number, weight: Weight): number;
}

const FONT_FILES: Record<Weight, string> = {
  regular: 'fonts/OpenSans-Regular.ttf',
  bold: 'fonts/OpenSans-Bold.ttf',
};

export const FONT_FAMILY = 'MenuSans';

let cached: Promise<Fonts> | null = null;

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

async function loadOne(weight: Weight, registerInBrowser: boolean): Promise<LoadedFont> {
  const res = await fetch(assetUrl(FONT_FILES[weight]));
  if (!res.ok) throw new Error(`Não foi possível carregar o tipo de letra (${weight}).`);
  const bytes = await res.arrayBuffer();
  const font = opentype.parse(bytes.slice(0));
  if (registerInBrowser && typeof FontFace !== 'undefined' && typeof document !== 'undefined') {
    const face = new FontFace(FONT_FAMILY, bytes.slice(0), { weight: weight === 'bold' ? '700' : '400' });
    await face.load();
    document.fonts.add(face);
  }
  return { weight, bytes, font };
}

/** Loads the bundled fonts once: metrics for layout, bytes for the PDF, FontFace for the browser. */
export function loadFonts(): Promise<Fonts> {
  if (!cached) {
    cached = (async () => {
      const [regular, bold] = await Promise.all([loadOne('regular', true), loadOne('bold', true)]);
      const fonts: Fonts = {
        regular,
        bold,
        measure(text, sizePt, weight) {
          const f = weight === 'bold' ? bold.font : regular.font;
          return f.getAdvanceWidth(text, sizePt, { kerning: true }) * PT_TO_MM;
        },
      };
      if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
      return fonts;
    })().catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}

/** Test/Node helper: build a Fonts object from raw bytes without touching the DOM. */
export function fontsFromBytes(regularBytes: ArrayBuffer, boldBytes: ArrayBuffer): Fonts {
  const regular: LoadedFont = { weight: 'regular', bytes: regularBytes, font: opentype.parse(regularBytes.slice(0)) };
  const bold: LoadedFont = { weight: 'bold', bytes: boldBytes, font: opentype.parse(boldBytes.slice(0)) };
  return {
    regular,
    bold,
    measure(text, sizePt, weight) {
      const f = weight === 'bold' ? bold.font : regular.font;
      return f.getAdvanceWidth(text, sizePt, { kerning: true }) * PT_TO_MM;
    },
  };
}
