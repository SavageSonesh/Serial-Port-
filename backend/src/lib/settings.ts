import { prisma } from '../prisma.js';
import { env } from '../env.js';

export const DEFAULT_SETTINGS: Record<string, string> = {
  defaultCountry: 'Worldwide',
  defaultLanguage: 'en',
  defaultNiche: '',
  defaultDateRange: '30d',
  theme: 'dark',
  refreshInterval: 'manual', // manual | 1h | 3h | 6h | 24h
  exportFormat: 'csv',
  ollamaEnabled: 'false',
  ollamaBaseUrl: env.ollamaBaseUrl,
  ollamaModel: env.ollamaModel,
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.appSetting.findMany();
  const map = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULT_SETTINGS[key] ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
