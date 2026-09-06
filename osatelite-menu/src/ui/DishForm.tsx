import { useMemo, useState, type FormEvent } from 'react';
import type { Category, Dish } from '../domain/types';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../domain/categories';
import { centsToInput, formatEuro, parseEuro } from '../domain/money';
import { findLikelyDuplicates, newId, nowIso } from '../domain/menuOps';
import { useStore } from '../state/store';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface Props {
  /** Existing dish to edit; omit to create a new one. */
  dish?: Dish;
  defaultCategory?: Category;
  onClose: () => void;
  onSaved?: (dish: Dish) => void;
}

export function DishForm({ dish, defaultCategory, onClose, onSaved }: Props) {
  const { dishes, saveDish } = useStore();
  const toast = useToast();
  const [name, setName] = useState(dish?.name ?? '');
  const [category, setCategory] = useState<Category>(dish?.category ?? defaultCategory ?? 'peixe');
  const [price, setPrice] = useState(dish ? centsToInput(dish.defaultPriceCents) : '');
  const [serving, setServing] = useState(dish?.servingInfo ?? '');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicates = useMemo(() => findLikelyDuplicates(dishes, name, dish?.id), [dishes, name, dish?.id]);
  const cents = parseEuro(price);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Indique o nome do prato.');
    if (cents === null) return setError('Preço inválido. Use por exemplo 13,50.');
    if (duplicates.length && !confirmDuplicate) {
      setConfirmDuplicate(true);
      return;
    }
    setBusy(true);
    try {
      const saved: Dish = {
        id: dish?.id ?? newId(),
        name: name.trim(),
        category,
        defaultPriceCents: cents,
        servingInfo: serving.trim() ? serving.trim() : null,
        archived: dish?.archived ?? false,
        createdAt: dish?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      await saveDish(saved);
      toast(dish ? 'Prato atualizado.' : 'Prato guardado no catálogo.');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={dish ? 'Editar prato' : 'Novo prato'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Nome
          <input value={name} onChange={(e) => { setName(e.target.value); setConfirmDuplicate(false); }} autoFocus required lang="pt-PT" />
        </label>
        {duplicates.length > 0 && (
          <div className="warn" role="alert">
            <strong>Já existe um prato parecido:</strong>{' '}
            {duplicates.map((d) => `${d.name} (${CATEGORY_LABEL[d.category]}, ${formatEuro(d.defaultPriceCents)}${d.archived ? ', arquivado' : ''})`).join('; ')}.
            {confirmDuplicate ? ' Carregue novamente em Guardar para criar mesmo assim.' : ''}
          </div>
        )}
        <label>
          Categoria
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preço por defeito (€)
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="13,50" required />
        </label>
        <label>
          Informação de dose (opcional)
          <input value={serving} onChange={(e) => setServing(e.target.value)} placeholder="2 PESSOAS" />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row-end">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'A guardar…' : duplicates.length && confirmDuplicate ? 'Guardar mesmo assim' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
