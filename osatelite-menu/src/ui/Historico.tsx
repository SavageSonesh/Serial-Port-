import { useState } from 'react';
import type { DailyMenu } from '../domain/types';
import { formatDatePt, isIsoDate, lisbonToday, longDatePt } from '../domain/dates';
import { duplicateMenu } from '../domain/menuOps';
import { useStore } from '../state/store';
import { Modal } from './Modal';
import { useToast } from './Toast';

function DuplicateDialog({ source, onClose, goEditor }: { source: DailyMenu; onClose: () => void; goEditor: () => void }) {
  const { menus, openMenu } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(lisbonToday());
  const clash = menus.find((m) => m.date === date);
  async function go() {
    try {
      await openMenu(duplicateMenu(source, date));
      toast(`Menu de ${formatDatePt(source.date)} duplicado para ${formatDatePt(date)}.`);
      onClose();
      goEditor();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  return (
    <Modal title={`Duplicar menu de ${formatDatePt(source.date)}`} onClose={onClose}>
      <label>
        Nova data
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="dup-date" />
      </label>
      {clash && (
        <p className="warn">
          Já existe um menu para {formatDatePt(date)}. Escolha outra data ou abra esse menu; nada será substituído.
        </p>
      )}
      <div className="row-end">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={go} disabled={!!clash || !isIsoDate(date)} data-testid="dup-confirm">
          Duplicar
        </button>
      </div>
    </Modal>
  );
}

export function Historico({ goEditor }: { goEditor: () => void }) {
  const { menus, openMenu, deleteMenu, currentMenuId } = useStore();
  const toast = useToast();
  const [dup, setDup] = useState<DailyMenu | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DailyMenu | null>(null);
  const sorted = [...menus].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="history">
      {sorted.length === 0 && <p className="muted">Ainda não há menus guardados.</p>}
      <ul className="menu-list" data-testid="menu-list">
        {sorted.map((m) => (
          <li key={m.id} className={`menu-row ${m.id === currentMenuId ? 'menu-row-open' : ''}`}>
            <div>
              <div className="menu-date">{formatDatePt(m.date)}</div>
              <div className="muted small">
                {longDatePt(m.date)} · {m.items.length} prato(s)
                {m.id === currentMenuId ? ' · aberto' : ''}
              </div>
            </div>
            <div className="dish-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await openMenu(m);
                  goEditor();
                }}
              >
                Abrir
              </button>
              <button type="button" className="btn" onClick={() => setDup(m)}>
                Duplicar…
              </button>
              <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmDelete(m)}>
                Apagar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {dup && <DuplicateDialog source={dup} onClose={() => setDup(null)} goEditor={goEditor} />}
      {confirmDelete && (
        <Modal title="Apagar menu" onClose={() => setConfirmDelete(null)}>
          <p>
            Apagar o menu de <strong>{formatDatePt(confirmDelete.date)}</strong> ({confirmDelete.items.length} pratos)? Os pratos continuam no
            catálogo.
          </p>
          <div className="row-end">
            <button type="button" className="btn" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                try {
                  await deleteMenu(confirmDelete.id);
                  toast('Menu apagado.');
                } catch (e) {
                  toast((e as Error).message, 'error');
                }
                setConfirmDelete(null);
              }}
            >
              Apagar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
