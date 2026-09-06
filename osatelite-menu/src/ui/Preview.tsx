import { useState } from 'react';
import type { DailyMenu } from '../domain/types';
import { useStore } from '../state/store';
import { MenuSvg } from '../render/svg';
import { renderPng } from '../render/png';
import { downloadBlob, menuFilename } from '../render/download';
import { formatDatePt } from '../domain/dates';
import { useAssets, useLayout } from './useAssets';
import { useToast } from './Toast';

interface Props {
  menu: DailyMenu;
}

/** Live A4 preview plus the three export actions. All use the same layout. */
export function Preview({ menu }: Props) {
  const { settings } = useStore();
  const { assets, error } = useAssets();
  const layout = useLayout(menu, settings, assets);
  const toast = useToast();
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);

  const blocked = !layout || layout.overflow || busy !== null;

  async function exportPdf() {
    if (!layout || !assets) return;
    setBusy('pdf');
    try {
      const { renderPdf } = await import('../render/pdf');
      const bytes = await renderPdf(layout, assets.fonts, assets.logo, `Menu do dia ${formatDatePt(menu.date)}`);
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), menuFilename(menu.date, 'pdf'));
      toast('PDF gerado.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function exportPng() {
    if (!layout || !assets) return;
    setBusy('png');
    try {
      const blob = await renderPng(layout, assets.logo);
      downloadBlob(blob, menuFilename(menu.date, 'png'));
      toast('PNG gerado.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  function print() {
    if (!layout || layout.overflow) return;
    window.print();
  }

  return (
    <div className="preview" data-testid="preview">
      <div className="preview-actions">
        <button type="button" className="btn btn-primary" onClick={exportPdf} disabled={blocked} data-testid="btn-pdf">
          {busy === 'pdf' ? 'A gerar…' : 'Descarregar PDF'}
        </button>
        <button type="button" className="btn" onClick={exportPng} disabled={blocked} data-testid="btn-png">
          {busy === 'png' ? 'A gerar…' : 'Descarregar PNG'}
        </button>
        <button type="button" className="btn" onClick={print} disabled={blocked} data-testid="btn-print">
          Imprimir
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {layout?.overflow && (
        <div className="warn" role="alert" data-testid="overflow-warning">
          <strong>O menu não cabe numa página A4.</strong> Retire pratos ou encurte nomes. A exportação e a impressão ficam
          bloqueadas até caber.
        </div>
      )}
      {layout && !layout.overflow && layout.tier.notice && (
        <p className="notice" data-testid="tier-notice">
          {layout.tier.notice}
        </p>
      )}
      {menu.items.length === 0 && <p className="muted">Ainda não há pratos neste menu.</p>}
      <div className="sheet-wrap">
        {layout && assets ? (
          <MenuSvg layout={layout} logoUrl={assets.logo.url} className="sheet" id="menu-preview" />
        ) : (
          <div className="sheet sheet-loading">A carregar tipos de letra e logótipo…</div>
        )}
      </div>
    </div>
  );
}

/** Print-only copy of the sheet; the rest of the interface is hidden via CSS when printing. */
export function PrintSheet({ menu }: { menu: DailyMenu | null }) {
  const { settings } = useStore();
  const { assets } = useAssets();
  const layout = useLayout(menu, settings, assets);
  if (!layout || !assets || layout.overflow) return null;
  return (
    <div className="print-sheet" aria-hidden="true">
      <MenuSvg layout={layout} logoUrl={assets.logo.url} />
    </div>
  );
}
