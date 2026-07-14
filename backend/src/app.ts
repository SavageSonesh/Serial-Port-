import express from 'express';
import cors from 'cors';
import { trendsRouter } from './routes/trends.js';
import { importRouter } from './routes/import.js';
import { dashboardRouter } from './routes/dashboard.js';
import { compareRouter } from './routes/compare.js';
import { crossPlatformRouter } from './routes/crossPlatform.js';
import { generatorRouter } from './routes/generator.js';
import { ideasRouter } from './routes/ideas.js';
import { nichesRouter } from './routes/niches.js';
import { sourcesRouter } from './routes/sources.js';
import { settingsRouter } from './routes/settings.js';
import { exportRouter } from './routes/export.js';
import { logger } from './logger.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  // CORS restricted to the local dev frontend only.
  app.use(cors({ origin: ['http://127.0.0.1:5173', 'http://localhost:5173'] }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'TrendRadar Local' }));

  app.use('/api/trends', trendsRouter);
  app.use('/api/import', importRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/compare', compareRouter);
  app.use('/api/cross-platform', crossPlatformRouter);
  app.use('/api/generator', generatorRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/niches', nichesRouter);
  app.use('/api/sources', sourcesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/export', exportRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint' }));

  // One failed route/connector never crashes the app.
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled route error', { error: err.stack ?? String(err) });
    res.status(500).json({ error: 'Something went wrong on the local server. Check the terminal logs for details.' });
  });

  return app;
}
