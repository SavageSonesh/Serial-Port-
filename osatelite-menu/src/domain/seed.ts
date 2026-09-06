import type { DailyMenu, Dish } from './types';
import { snapshotDish } from './menuOps';

/**
 * Initial catalogue transcribed from the reference menu photo dated 06-09-2026.
 * Every line of the photo was legible; nothing was guessed.
 * IDs are fixed so that the seed is idempotent across storage backends.
 */
const SEED_AT = '2026-09-06T00:00:00.000Z';

type SeedRow = [id: string, name: string, category: Dish['category'], cents: number, serving?: string];

const ROWS: SeedRow[] = [
  ['a0000000-0000-4000-8000-000000000001', 'Canja de Galinha', 'sopa', 200],
  ['a0000000-0000-4000-8000-000000000011', 'Polvo à Lagareiro', 'peixe', 1850],
  ['a0000000-0000-4000-8000-000000000012', 'Arroz de Gambas', 'peixe', 1350],
  ['a0000000-0000-4000-8000-000000000013', 'Sardinhas Assadas', 'peixe', 1100],
  ['a0000000-0000-4000-8000-000000000014', 'Carapaus Grelhados', 'peixe', 1100],
  ['a0000000-0000-4000-8000-000000000015', 'Corvininha Grelhada', 'peixe', 1250],
  ['a0000000-0000-4000-8000-000000000016', 'Besugo Grelhado', 'peixe', 1200],
  ['a0000000-0000-4000-8000-000000000017', 'Bife de Atum Grelhado', 'peixe', 1850],
  ['a0000000-0000-4000-8000-000000000018', 'Bife de Espadarte Grelhado', 'peixe', 1850],
  ['a0000000-0000-4000-8000-000000000019', 'Peixe Espada Branco Grelhado', 'peixe', 1750],
  ['a0000000-0000-4000-8000-00000000001a', 'Boca Negra Grelhado', 'peixe', 2400],
  ['a0000000-0000-4000-8000-00000000001b', 'Lula Grande dos Açores Grelhada', 'peixe', 3400, '2 PESSOAS'],
  ['a0000000-0000-4000-8000-000000000021', 'Cozido à Portuguesa', 'carne', 1350],
  ['a0000000-0000-4000-8000-000000000022', 'Pernil Assado no Forno', 'carne', 1350],
  ['a0000000-0000-4000-8000-000000000023', 'Piano no Churrasco', 'carne', 1300],
  ['a0000000-0000-4000-8000-000000000024', 'Hambúrguer Grelhado com Batata e Arroz', 'carne', 1200],
  ['a0000000-0000-4000-8000-000000000025', 'Bife de Peru Frito ou Grelhado', 'carne', 1200],
  ['a0000000-0000-4000-8000-000000000026', 'Entremeada de Porco Grelhada', 'carne', 1000],
  ['a0000000-0000-4000-8000-000000000027', 'Salsichas Frescas Grelhadas', 'carne', 1000],
  ['a0000000-0000-4000-8000-000000000031', 'Caril de Legumes', 'vegetariano', 900],
  ['a0000000-0000-4000-8000-000000000041', 'Pudim Abade de Priscos', 'sobremesa', 550],
  ['a0000000-0000-4000-8000-000000000042', 'Bolo de Coco', 'sobremesa', 400],
  ['a0000000-0000-4000-8000-000000000043', 'Semifrio de Morango', 'sobremesa', 400],
  ['a0000000-0000-4000-8000-000000000044', 'Farófias', 'sobremesa', 400],
  ['a0000000-0000-4000-8000-000000000045', 'Taça de Frutos Vermelhos', 'sobremesa', 400],
  ['a0000000-0000-4000-8000-000000000046', 'Torta de Laranja', 'sobremesa', 400],
  ['a0000000-0000-4000-8000-000000000047', 'Melão', 'sobremesa', 350],
];

export const SEED_DISHES: Dish[] = ROWS.map(([id, name, category, cents, serving]) => ({
  id,
  name,
  category,
  defaultPriceCents: cents,
  servingInfo: serving ?? null,
  archived: false,
  createdAt: SEED_AT,
  updatedAt: SEED_AT,
}));

/** The reference menu itself (06-09-2026), stored as the first historical menu. */
export const SEED_MENU: DailyMenu = {
  id: 'b0000000-0000-4000-8000-000000000001',
  date: '2026-09-06',
  items: SEED_DISHES.map(snapshotDish),
  createdAt: SEED_AT,
  updatedAt: SEED_AT,
};
