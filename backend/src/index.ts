import './env.js';
import { env } from './env.js';
import { createApp } from './app.js';
import { startScheduler, refreshMonitoredItems } from './scheduler.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';

const app = createApp();

// Manual refresh endpoint for the "Refresh now" button.
app.post('/api/monitoring/refresh', async (_req, res) => {
  const result = await refreshMonitoredItems();
  res.json(result);
});

// SECURITY: bound to 127.0.0.1 (loopback) only — never 0.0.0.0.
const server = app.listen(env.port, env.host, () => {
  logger.info(`TrendRadar Local backend running at http://${env.host}:${env.port} (local-only, not exposed publicly)`);
});

const schedulerHandle = startScheduler();

async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down`);
  clearInterval(schedulerHandle);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
