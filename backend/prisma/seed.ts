// Idempotent seed: platforms + default niches. Demo data is separate and optional.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'google-trends', name: 'Google Trends' },
];

const DEFAULT_NICHES = [
  'Animal facts', 'Plant facts', 'Couple comedy', 'Couple games', 'Food content',
  'Restaurant content', 'Educational shorts', 'Interesting history', 'Technology',
  'Artificial intelligence', 'Travel', 'Finance', 'Motivation', 'Football', 'Gaming',
];

async function main() {
  for (const p of PLATFORMS) {
    await prisma.platform.upsert({ where: { id: p.id }, create: p, update: { name: p.name } });
  }
  for (const name of DEFAULT_NICHES) {
    await prisma.niche.upsert({ where: { name }, create: { name, isDefault: true }, update: { isDefault: true } });
  }
  console.log(`Seeded ${PLATFORMS.length} platforms and ${DEFAULT_NICHES.length} default niches.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
