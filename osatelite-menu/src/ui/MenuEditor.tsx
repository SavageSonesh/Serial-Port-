import { useEffect, useState, type DragEvent } from 'react';
import type { Category, DailyMenu, MenuItem } from '../domain/types';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../domain/categories';
import { centsToInput, formatEuro, parseEuro } from '../domain/money';
import { formatDatePt, isIsoDate, longDatePt } from '../domain/dates';
import { moveWithinCategory } from '../domain/menuOps';
import { useStore } from '../state/store';
import { DishPicker } from './DishPicker';
import { useToast } from './Toast';

function SaveBadge() {
  const { saveStatus, saveError } = useStore();
  const label = { idle: 'Guardado', saving: 'A guardar…', saved: 'Guardado', error: 'Erro ao guardar' }[saveStatus];
  return (
    <span className={`badge badge-${saveStatus}`} data-testid="save-status" title={saveError ?? undefined}>
      {label}
      {saveStatus === 'error' && saveError ? ` — ${saveError}` : ''}
    </span>
  );
}

function PriceField({ item, index }: { item: MenuItem; index: number }) {
  const { dishes, updateCurrentMenu, saveDish } = useStore();
  const toast = useToast();
  const [text, setText] = useState(centsToInput(item.priceCents));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setText(centsToInput(item.priceCents)), [item.priceCents]);
  const dish = item.dishId ? dishes.find((d) => d.id === item.dishId) : undefined;
  const differs = dish ? dish.defaultPriceCents !== item.priceCents : false;

  function commit() {
    const cents = parseEuro(text);
    if (cents === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(centsToInput(cents));
    if (cents !== item.priceCents) updateCurrentMenu((m) => ({ ...m, items: m.items.map((it, i) => (i === index ? { ...it, priceCents: cents } : it)) }));
  }

  async function updateCatalogue() {
    if (!dish) return;
    try {
      await saveDish({ ...dish, defaultPriceCents: item.priceCents });
      toast(`Preço de catálogo de "${dish.name}" atualizado para ${formatEuro(item.priceCents)}.`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="price-field">
      <div className="price-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          inputMode="decimal"
          aria-label={`Preço de hoje de ${item.name}`}
          aria-invalid={invalid}
          className={invalid ? 'invalid' : ''}
        />
        <span>€</span>
      </div>
      {differs && dish && (
        <div className="price-note">
          <span>Só hoje · catálogo {formatEuro(dish.defaultPriceCents)}</span>
          <button type="button" className="link" onClick={updateCatalogue}>
            Atualizar preço no catálogo
          </button>
        </div>
      )}
      {invalid && <span className="error">Preço inválido</span>}
    </div>
  );
}

function CategoryGroup({ menu, category }: { menu: DailyMenu; category: Category }) {
  const { updateCurrentMenu } = useStore();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const indexed = menu.items.map((item, index) => ({ item, index })).filter((x) => x.item.category === category);
  if (indexed.length === 0) return null;

  const move = (from: number, to: number) => updateCurrentMenu((m) => ({ ...m, items: moveWithinCategory(m.items, category, from, to) }));
  const remove = (index: number) => updateCurrentMenu((m) => ({ ...m, items: m.items.filter((_, i) => i !== index) }));

  function onDrop(e: DragEvent, to: number) {
    e.preventDefault();
    if (dragFrom !== null && dragFrom !== to) move(dragFrom, to);
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <section className="group" data-testid={`group-${category}`}>
      <h3>{CATEGORY_LABEL[category]}</h3>
      <ul className="items">
        {indexed.map(({ item, index }, pos) => (
          <li
            key={`${item.dishId ?? item.name}-${index}`}
            className={`item ${dragOver === pos ? 'item-over' : ''}`}
            draggable
            onDragStart={(e) => {
              setDragFrom(pos);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(pos);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(e, pos)}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
          >
            <span className="handle" aria-hidden="true">
              ⠿
            </span>
            <div className="item-main">
              <div className="item-name">
                {item.name}
                {item.servingInfo ? <span className="muted"> ({item.servingInfo})</span> : null}
              </div>
              <PriceField item={item} index={index} />
            </div>
            <div className="item-actions">
              <button type="button" className="btn btn-icon" onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label={`Subir ${item.name}`}>
                ↑
              </button>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => move(pos, pos + 1)}
                disabled={pos === indexed.length - 1}
                aria-label={`Descer ${item.name}`}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-icon btn-danger"
                onClick={() => remove(index)}
                aria-label={`Remover ${item.name} do menu de hoje`}
                title="Remover do menu de hoje (continua no catálogo)"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MenuEditor({ menu }: { menu: DailyMenu }) {
  const { menus, updateCurrentMenu, closeMenu } = useStore();
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const [dateText, setDateText] = useState(menu.date);
  useEffect(() => setDateText(menu.date), [menu.date]);

  function commitDate() {
    if (!isIsoDate(dateText)) {
      setDateText(menu.date);
      return;
    }
    if (dateText === menu.date) return;
    if (menus.some((m) => m.date === dateText && m.id !== menu.id)) {
      toast(`Já existe um menu para ${formatDatePt(dateText)}. Abra-o no Histórico.`, 'error');
      setDateText(menu.date);
      return;
    }
    updateCurrentMenu((m) => ({ ...m, date: dateText }));
  }

  return (
    <div className="editor" data-testid="editor">
      <div className="editor-head">
        <div>
          <label className="date-label">
            Data do menu
            <input type="date" value={dateText} onChange={(e) => setDateText(e.target.value)} onBlur={commitDate} data-testid="menu-date" />
          </label>
          <div className="muted small">
            {longDatePt(menu.date)} · impresso como <strong>{formatDatePt(menu.date)}</strong>
          </div>
        </div>
        <div className="editor-head-right">
          <SaveBadge />
          <button type="button" className="btn" onClick={closeMenu}>
            Fechar
          </button>
        </div>
      </div>
      <div className="editor-tools">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setPicking(true)} data-testid="btn-pick">
          Escolher pratos
        </button>
        <span className="muted">{menu.items.length} prato(s) no menu</span>
      </div>
      {menu.items.length === 0 && <p className="empty">Toque em “Escolher pratos” para começar.</p>}
      {CATEGORY_ORDER.map((c) => (
        <CategoryGroup key={c} menu={menu} category={c} />
      ))}
      <p className="muted small">
        ✕ remove o prato apenas do menu deste dia. Para arquivar um prato do catálogo use “Pratos guardados”.
      </p>
      {picking && <DishPicker onClose={() => setPicking(false)} />}
    </div>
  );
}
