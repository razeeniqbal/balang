import type { Food, FoodId } from './types';

/** Canonical BALANG food-token library. Each match draws 5 of these per round. */
export const FOOD_LIBRARY: Food[] = [
  { id: 'onde-onde', name: 'Onde-Onde', color: '#3f8f3a' },
  { id: 'kuih-bahulu', name: 'Kuih Bahulu', color: '#e8a526' },
  { id: 'kuih-lapis', name: 'Kuih Lapis', color: '#e2527a' },
  { id: 'muruku', name: 'Muruku', color: '#e06a18' },
  { id: 'dodol', name: 'Dodol', color: '#6b3a1f' },
  { id: 'curry-puff', name: 'Karipap', color: '#cf2e2a' },
  { id: 'kuih-ketayap', name: 'Kuih Ketayap', color: '#6aae35' },
  { id: 'apam-balik', name: 'Apam Balik', color: '#a8692a' },
  { id: 'keropok-lekor', name: 'Keropok Lekor', color: '#1d8585' },
  { id: 'tart-nenas', name: 'Tart Nenas', color: '#d8407a' },
];

const byId = new Map(FOOD_LIBRARY.map((f) => [f.id, f]));

export function food(id: FoodId): Food {
  const f = byId.get(id);
  if (!f) throw new Error(`Unknown food ${id}`);
  return f;
}

export const foodImage = (id: FoodId) => `/assets/food/${id}.png`;
export const chipImage = (id: FoodId) => `/assets/chips/${id}.png`;
