import { useMemo, useState } from 'react';
import type { Category, Dish } from '../domain/types';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../domain/categories';
import { formatEuro } from '../domain/money';
import { addDishToMenu, normaliseName } from '../domain/menuOps';
import { useStore } from '../state/store';
import { Modal } from './Modal';
import { DishForm } from './DishForm';

interface Props {
  onClose: () => void;
}

/** Select / deselect catalogue dishes for the open menu. */
export function DishPicker({ onClose }: Props) {
  const { dishes, currentMenu, updateCurrentMenu } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const [creating, setCreating] = useState(false);

  const selectedIds = useMemo(() => new Set(currentMenu?.items.map((i) => i.dishId)), [currentMenu]);
  const visible = useMemo(() => {
    const q = normaliseName(query);
    return dishes
      .filter((d) => !d.archived)
      .filter((d) => category === 'todas' || d.category === category)
      .filter((d) => !q || normaliseName(d.name).includes(q));
  }, [dishes, query, category]);

  function toggle(dish: Dish) {
    updateCurrentMenu((m) =>
      selectedIds.has(dish.id) ? { ...m, items: m.items.filter((i) => i.dishId !== dish.id) } : addDishToMenu(m, dish),
    );
  }

  const grouped = CATEGORY_ORDER.map((c) => ({ c, list: visible.filter((d) => d.category === c) })).filter((g) => g.list.length);

  return (
    <Modal title="Escolher pratos" onClose={onClose} wide>
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
        <button type="button" className="btn" onClick={() => setCreating(true)}>
          + Novo prato
        </button>
      </div>
      <p className="muted">
        {selectedIds.size} selecionado(s). Desmarcar retira o prato só do menu de hoje; o prato continua guardado no catálogo.
      </p>
      {grouped.length === 0 && <p className="muted">Nenhum prato encontrado.</p>}
      {grouped.map(({ c, list }) => (
        <section key={c} className="picker-group">
          <h3>{CATEGORY_LABEL[c]}</h3>
          <ul className="picker-list">
            {list.map((d) => {
              const on = selectedIds.has(d.id);
              return (
                <li key={d.id}>
                  <label className={`pick ${on ? 'pick-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(d)} />
                    <span className="pick-name">
                      {d.name}
                      {d.servingInfo ? <span className="muted"> ({d.servingInfo})</span> : null}
                    </span>
                    <span className="pick-price">{formatEuro(d.defaultPriceCents)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="row-end">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Concluir
        </button>
      </div>
      {creating && (
        <DishForm
          defaultCategory={category === 'todas' ? undefined : category}
          onClose={() => setCreating(false)}
          onSaved={(dish) => updateCurrentMenu((m) => addDishToMenu(m, dish))}
        />
      )}
    </Modal>
  );
}
