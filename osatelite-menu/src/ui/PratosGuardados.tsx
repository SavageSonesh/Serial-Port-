import { useMemo, useState } from 'react';
import type { Category, Dish } from '../domain/types';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../domain/categories';
import { formatEuro } from '../domain/money';
import { addDishToMenu, normaliseName } from '../domain/menuOps';
import { useStore } from '../state/store';
import { DishForm } from './DishForm';
import { useToast } from './Toast';

export function PratosGuardados() {
  const { dishes, saveDish, currentMenu, updateCurrentMenu } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const q = normaliseName(query);
    return dishes
      .filter((d) => (showArchived ? d.archived : !d.archived))
      .filter((d) => category === 'todas' || d.category === category)
      .filter((d) => !q || normaliseName(d.name).includes(q))
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name, 'pt'));
  }, [dishes, query, category, showArchived]);

  async function setArchived(dish: Dish, archived: boolean) {
    try {
      await saveDish({ ...dish, archived });
      toast(archived ? `"${dish.name}" arquivado. Os menus antigos não mudam.` : `"${dish.name}" restaurado.`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const inMenu = new Set(currentMenu?.items.map((i) => i.dishId));

  return (
    <div className="catalogue">
      <div className="picker-tools">
        <input type="search" placeholder="Procurar prato…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Procurar prato" />
        <div className="chips" role="group" aria-label="Filtrar por categoria">
          <button type="button" className={`chip ${category === 'todas' ? 'chip-on' : ''}`} onClick={() => setCategory('todas')}>
            Todas
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button key={c} type="button" className={`chip ${category === c ? 'chip-on' : ''}`} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Mostrar arquivados
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)} data-testid="btn-new-dish">
          + Novo prato
        </button>
      </div>
      {visible.length === 0 && <p className="muted">Nenhum prato {showArchived ? 'arquivado' : ''} encontrado.</p>}
      <ul className="dish-list" data-testid="dish-list">
        {visible.map((d) => (
          <li key={d.id} className="dish">
            <div className="dish-main">
              <div className="dish-name">
                {d.name}
                {d.servingInfo ? <span className="muted"> ({d.servingInfo})</span> : null}
              </div>
              <div className="muted small">
                {CATEGORY_LABEL[d.category]} · {formatEuro(d.defaultPriceCents)}
                {d.archived ? ' · arquivado' : ''}
              </div>
            </div>
            <div className="dish-actions">
              {currentMenu && !d.archived && (
                <button
                  type="button"
                  className="btn"
                  disabled={inMenu.has(d.id)}
                  onClick={() => updateCurrentMenu((m) => addDishToMenu(m, d))}
                >
                  {inMenu.has(d.id) ? 'No menu' : 'Adicionar ao menu'}
                </button>
              )}
              <button type="button" className="btn" onClick={() => setEditing(d)}>
                Editar
              </button>
              {d.archived ? (
                <button type="button" className="btn" onClick={() => setArchived(d, false)}>
                  Restaurar
                </button>
              ) : (
                <button type="button" className="btn btn-danger-outline" onClick={() => setArchived(d, true)} title="Arquivar do catálogo (não altera menus antigos)">
                  Arquivar do catálogo
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {editing && <DishForm dish={editing} onClose={() => setEditing(null)} />}
      {creating && <DishForm onClose={() => setCreating(false)} />}
    </div>
  );
}
