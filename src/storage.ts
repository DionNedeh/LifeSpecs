import { del, get, set } from 'idb-keyval';
import { createInitialData, normalizeImport } from './data';
import type { LifeSpecsData } from './types';

const DATA_KEY = 'lifespecs:data:v1';

export async function loadLifeSpecsData(): Promise<LifeSpecsData> {
  const stored = await get<LifeSpecsData>(DATA_KEY);
  return stored ? normalizeImport(stored) : createInitialData();
}

export async function saveLifeSpecsData(data: LifeSpecsData) {
  await set(DATA_KEY, data);
}

export async function importLifeSpecsData(value: unknown): Promise<LifeSpecsData> {
  const data = normalizeImport(value);
  await saveLifeSpecsData(data);
  return data;
}

export async function clearLifeSpecsData() {
  await del(DATA_KEY);
}
