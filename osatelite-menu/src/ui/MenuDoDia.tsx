import { useState } from 'react';
import { createMenu, duplicateMenu } from '../domain/menuOps';
import { formatDatePt, isIsoDate, lisbonToday } from '../domain/dates';
import { useStore } from '../state/store';
import { MenuEditor } from './MenuEditor';
import { Preview } from './Preview';
import { useToast } from './Toast';

function StartScreen({ goHistory }: { goHistory: () => void }) {
  const { menus, openMenu } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(lisbonToday());
  const existing = menus.find((m) => m.date === date);
  const latest = [...menus].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const validDate = isIsoDate(date);

  async function start() {
    try {
      await openMenu(createMenu(date));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function duplicateLatest() {
    if (!latest) return;
    try {
      await openMenu(duplicateMenu(latest, date));
      toast(`Menu de ${formatDatePt(latest.date)} duplicado para ${formatDatePt(date)}.`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="start card">
      <h2>Menu do dia</h2>
      <label>
        Data (hoje em Lisboa: {formatDatePt(lisbonToday())})
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="start-date" />
      </label>
      {!validDate && <p className="error">Data inválida.</p>}
      {existing ? (
        <>
          <p className="notice">Já existe um menu para {formatDatePt(date)}.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => openMenu(existing)} data-testid="btn-open-existing">
            Abrir o menu de {formatDatePt(date)}
          </button>
        </>
      ) : (
        <>
          {latest && (
            <button type="button" className="btn btn-primary btn-lg" onClick={duplicateLatest} disabled={!validDate} data-testid="btn-duplicate-latest">
              Duplicar o último menu ({formatDatePt(latest.date)}) para {validDate ? formatDatePt(date) : '…'}
            </button>
          )}
          <button type="button" className="btn btn-lg" onClick={start} disabled={!validDate} data-testid="btn-start-empty">
            Começar menu vazio para {validDate ? formatDatePt(date) : '…'}
          </button>
        </>
      )}
      <button type="button" className="btn btn-ghost" onClick={goHistory}>
        Abrir um menu anterior no Histórico
      </button>
    </div>
  );
}

export function MenuDoDia({ goHistory }: { goHistory: () => void }) {
  const { currentMenu } = useStore();
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  if (!currentMenu) return <StartScreen goHistory={goHistory} />;
  return (
    <div className={`workspace view-${mobileView}`}>
      <div className="pane pane-editor">
        <MenuEditor menu={currentMenu} />
      </div>
      <div className="pane pane-preview">
        <Preview menu={currentMenu} />
      </div>
      <div className="view-switch" role="tablist" aria-label="Vista">
        <button type="button" role="tab" aria-selected={mobileView === 'edit'} className={mobileView === 'edit' ? 'on' : ''} onClick={() => setMobileView('edit')}>
          Editar
        </button>
        <button type="button" role="tab" aria-selected={mobileView === 'preview'} className={mobileView === 'preview' ? 'on' : ''} onClick={() => setMobileView('preview')}>
          Pré-visualizar
        </button>
      </div>
    </div>
  );
}
