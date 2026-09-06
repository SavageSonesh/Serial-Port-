import type { Layout } from './layout';
import { FONT_FAMILY } from './fonts';
import { PT_TO_MM } from './template';

interface Props {
  layout: Layout;
  logoUrl: string;
  /** Extra attributes for the root element (e.g. id, className). */
  id?: string;
  className?: string;
}

/**
 * Preview / print renderer. Draws the exact same positioned runs as the PDF
 * and PNG renderers, in millimetre user units on an A4 viewBox.
 */
export function MenuSvg({ layout, logoUrl, id, className }: Props) {
  const { page, texts, logo } = layout;
  return (
    <svg
      id={id}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${page.width} ${page.height}`}
      role="img"
      aria-label="Pré-visualização do menu"
      style={{ fontFamily: `${FONT_FAMILY}, 'Segoe UI', 'Open Sans', sans-serif`, background: '#fff' }}
    >
      <rect x="0" y="0" width={page.width} height={page.height} fill="#ffffff" />
      {texts.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={t.y}
          fontSize={t.sizePt * PT_TO_MM}
          fontWeight={t.weight === 'bold' ? 700 : 400}
          fill="#111111"
          data-kind={t.kind}
          xmlSpace="preserve"
        >
          {t.text}
        </text>
      ))}
      <image
        href={logoUrl}
        x={logo.x}
        y={logo.y}
        width={logo.width}
        height={logo.height}
        preserveAspectRatio="xMidYMid meet"
        style={logo.grayscale ? { filter: 'grayscale(1)' } : undefined}
      />
    </svg>
  );
}
