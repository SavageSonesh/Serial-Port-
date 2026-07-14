// Periodic refresh of monitored items — runs ONLY while this local server runs.
// Respects the refresh interval chosen in Settings ("manual" disables it).

import { prisma } from './prisma.js';
import { getSetting } from './lib/settings.js';
import { importUrl } from './services/trendService.js';
import { logger } from './logger.js';

const INTERVALS: Record<string, number> = {
  '1h': 3_600_000,
  '3h': 3 * 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
};

let lastRefreshAt = 0;
let running = false;

export async function refreshMonitoredItems(): Promise<{ refreshed: number; skipped: number }> {
  if (running) return { refreshed: 0, skipped: 0 };
  running = true;
  let refreshed = 0;
  let skipped = 0;
  try {
    const items = await prisma.trendItem.findMany({ where: { monitoring: true, url: { not: null } }, take: 50 });
    for (const item of items) {
      // Only platforms with a permitted automatic path benefit; others keep manual metrics.
      if (!item.url) continue;
      try {
        const r = await importUrl(item.url);
        if (r.status === 'updated' || r.status === 'created') refreshed++;
        else skipped++;
      } catch (err) {
        skipped++;
        logger.warn(`Scheduled refresh failed for item ${item.id}`, { error: String(err) });
      }
      await new Promise((resolve) => setTimeout(resolve, 500)); // gentle pacing
    }
    lastRefreshAt = Date.now();
    if (items.length > 0) logger.info(`Scheduled refresh done: ${refreshed} refreshed, ${skipped} unchanged/skipped`);
  } finally {
    running = false;
  }
  return { refreshed, skipped };
}

export function startScheduler(): NodeJS.Timeout {
  // Check every 5 minutes whether a refresh is due per the configured interval.
  return setInterval(async () => {
    try {
      const setting = await getSetting('refreshInterval');
      const intervalMs = INTERVALS[setting];
      if (!intervalMs) return; // "manual" or unknown → no automatic refresh
      if (Date.now() - lastRefreshAt >= intervalMs) {
        await refreshMonitoredItems();
      }
    } catch (err) {
      logger.warn('Scheduler tick failed', { error: String(err) });
    }
  }, 5 * 60_000);
}
