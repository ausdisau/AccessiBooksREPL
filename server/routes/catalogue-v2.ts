import type { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { catalogueRegistry } from '../services/catalogue-v2/registry';
import type { ProviderId } from '../services/catalogue-v2/types';

const providerIds = ['librivox', 'gutenberg', 'internet-archive', 'google-books', 'open-library', 'amazon-creators'] as const;
const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  source: z.enum(['librivox', 'gutenberg', 'internet-archive', 'google-books', 'open-library', 'amazon-creators', 'all']).default('all'),
  language: z.string().regex(/^[A-Za-z-]{2,12}$/).optional(),
  format: z.enum(['audiobook', 'ebook']).optional(),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  cursor: z.string().regex(/^\d{1,8}$/).optional(),
});
const indexedSchema = z.object({
  q: z.string().trim().min(1).max(120),
  source: z.enum(providerIds).optional(),
  format: z.enum(['audiobook', 'ebook']).optional(),
  language: z.string().regex(/^[A-Za-z-]{2,12}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
// In-process staging limiter; use an edge/distributed limiter for multi-instance production.
const windows = new Map<string, { start: number; count: number }>();
const throttle = (req: Request, res: Response, next: NextFunction): void => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const hit = windows.get(key);
  if (hit && now - hit.start < 60_000) {
    if (++hit.count > 30) { res.status(429).json({ error: 'Search limit reached. Try again later.' }); return; }
  } else {
    if (windows.size > 5000) {
      for (const [ip, item] of windows) if (now - item.start >= 60_000) windows.delete(ip);
      if (windows.size > 5000) { res.status(429).json({ error: 'Search temporarily busy' }); return; }
    }
    windows.set(key, { start: now, count: 1 });
  }
  res.setHeader('RateLimit-Limit', '30');
  next();
};

export function registerCatalogueV2Routes(app: Express): void {
  app.get('/api/catalogue/sources', (_req, res) => {
    res.json({ sources: catalogueRegistry.listSources(), note: 'Configured does not mean a provider is currently reachable.' });
  });

  app.get('/api/catalogue/search', throttle, async (req: Request, res: Response) => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid catalogue search parameters' });
    const { source, q, limit, cursor, language, format } = parsed.data;
    if (source === 'amazon-creators' && !catalogueRegistry.providers.has('amazon-creators')) {
      return res.status(503).json({ error: 'Amazon Creators API credentials have not been configured.' });
    }
    const ids: ProviderId[] = source === 'all'
      ? [...catalogueRegistry.providers.keys()].filter(id => id !== 'amazon-creators') : [source];
    try {
      const result = await catalogueRegistry.search(ids, { query: q, limit, cursor, language, format });
      res.json({ ...result, query: q });
    } catch {
      res.status(502).json({ error: 'Catalogue search unavailable' });
    }
  });

  app.get('/api/catalogue/index', throttle, async (req: Request, res: Response) => {
    const parsed = indexedSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid catalogue index search parameters' });
    try {
      const { queryIndexedCatalogue } = await import('../services/catalogue-v2/persistence');
      res.json(await queryIndexedCatalogue({ query: parsed.data.q, provider: parsed.data.source,
        format: parsed.data.format, language: parsed.data.language,
        limit: parsed.data.limit, offset: parsed.data.offset }));
    } catch (error) {
      console.error('Catalogue index search error:', error instanceof Error ? error.name : 'unknown');
      res.status(503).json({ error: 'Indexed catalogue unavailable; database migration may be required' });
    }
  });

  app.get('/api/catalogue/books/:provider/:providerId', throttle, async (req: Request, res: Response) => {
    const provider = req.params.provider;
    const providerId = req.params.providerId;
    if (!providerIds.includes(provider as ProviderId) || !providerId || providerId.length > 150) {
      return res.status(400).json({ error: 'Unknown provider or invalid record ID' });
    }
    if (provider === 'amazon-creators' && !catalogueRegistry.providers.has('amazon-creators')) {
      return res.status(503).json({ error: 'Amazon Creators API is not configured' });
    }
    try {
      const item = await catalogueRegistry.getBook(provider as ProviderId, providerId);
      if (!item) return res.status(404).json({ error: 'Catalogue record not found' });
      res.json(item);
    } catch {
      res.status(502).json({ error: 'Source catalogue temporarily unavailable' });
    }
  });
}
