/** Polite read-only API client, with per-provider serialization, timeouts and bounded retries. */
export class CatalogueHttpError extends Error {
  constructor(readonly status: number, readonly source: string) {
    super(`Catalogue service returned HTTP ${status}`);
    this.name = 'CatalogueHttpError';
  }
}
export interface HttpClientOptions {
  minIntervalMs?: number;
  timeoutMs?: number;
  retries?: number;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}
const sleepDefault = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export class PoliteHttpClient {
  private nextSlot = 0;
  private chain: Promise<void> = Promise.resolve();
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly fetchFn: typeof fetch;
  constructor(private readonly options: HttpClientOptions = {}) {
    this.sleep = options.sleep || sleepDefault;
    this.fetchFn = options.fetchFn || fetch;
  }
  private async acquire(): Promise<void> {
    const task = this.chain.then(async () => {
      const now = Date.now();
      if (this.nextSlot > now) await this.sleep(this.nextSlot - now);
      this.nextSlot = Date.now() + (this.options.minIntervalMs ?? 1000);
    });
    this.chain = task.catch(() => {});
    await task;
  }
  async json(url: string): Promise<unknown> {
    if (!url.startsWith('https://')) throw new Error('Only HTTPS content APIs are supported');
    const attempts = (this.options.retries ?? 2) + 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      await this.acquire();
      try {
        const response = await this.fetchFn(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'AccessiBooksCatalogue/2.0' },
          signal: AbortSignal.timeout(this.options.timeoutMs ?? 25_000),
        });
        if (response.ok) return response.json() as Promise<unknown>;
        const retryable = response.status === 429 || [500, 502, 503, 504].includes(response.status);
        if (!retryable || attempt === attempts - 1) throw new CatalogueHttpError(response.status, url);
        const retryAfter = Number(response.headers.get('retry-after'));
        const baseWait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000 : 1500 * 2 ** attempt;
        await this.sleep(Math.min(120_000, Math.max(1500, baseWait)));
      } catch (error) {
        if (error instanceof CatalogueHttpError || attempt === attempts - 1) throw error;
        await this.sleep(Math.min(12_000, 1500 * 2 ** attempt));
      }
    }
    throw new Error('Catalogue fetch attempts exhausted');
  }
}
