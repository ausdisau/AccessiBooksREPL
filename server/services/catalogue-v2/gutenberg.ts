import { CatalogueHttpError, PoliteHttpClient } from './http';
import {
  type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery, type JsonFetcher,
  asRecord, asArray, asText, asPositiveInt, httpsUrl, parseCursor, safeAssets, stableId, sourceRights,
} from './types';

/** Gutendex exposes the Project Gutenberg catalogue; full paging uses `page`. */
export class GutenbergAdapter implements CatalogueAdapter {
  readonly id = 'gutenberg' as const;
  readonly name = 'Project Gutenberg';
  readonly supportsBulkSync = true;
  private readonly getJson: JsonFetcher;
  constructor(getJson?: JsonFetcher) {
    const client = new PoliteHttpClient({ minIntervalMs: 1500 });
    this.getJson = getJson || ((url) => client.json(url));
  }
  async search(query: CatalogueQuery): Promise<CataloguePage> {
    if (query.format === 'audiobook') return { items: [], nextCursor: null };
    const page = parseCursor(query.cursor, 1);
    if (page < 1) throw new Error('Invalid Gutendex page');
    const url = new URL('https://gutendex.com/books');
    if (query.query) url.searchParams.set('search', query.query);
    if (query.language) url.searchParams.set('languages', query.language);
    url.searchParams.set('page', String(page));
    const payload = asRecord(await this.getJson(url.toString()));
    if (!Array.isArray(payload.results)) throw new Error('Gutendex returned an unexpected payload');
    const items = payload.results.map((b: unknown) => this.normalize(b)).filter((b): b is CatalogueBook => !!b);
    const filtered = items;
    return { items: filtered, total: Number(payload.count) || undefined,
      nextCursor: payload.next ? String(page + 1) : null };
  }
  listPage(cursor: string | undefined, limit: number): Promise<CataloguePage> {
    // Gutendex sets its own page size; "limit" is deliberately ignored.
    return this.search({ query: '', limit, cursor });
  }
  async getBook(providerId: string): Promise<CatalogueBook | null> {
    if (!/^\d{1,10}$/.test(providerId)) return null;
    try { return this.normalize(await this.getJson(`https://gutendex.com/books/${providerId}`)); }
    catch (error) {
      if (error instanceof CatalogueHttpError && error.status === 404) return null;
      throw error;
    }
  }
  normalize(value: unknown): CatalogueBook | null {
    const raw = asRecord(value);
    const id = asPositiveInt(raw.id);
    const title = asText(raw.title);
    if (!id || !title) return null;
    const authors = asArray(raw.authors).map((a: unknown) => asText(asRecord(a).name)).filter(Boolean);
    const subjects = asArray(raw.subjects).map(asText).filter(Boolean).slice(0, 25);
    const formats = asRecord(raw.formats);
    const epub = httpsUrl(formats['application/epub+zip']);
    const html = httpsUrl(formats['text/html']) || httpsUrl(formats['text/html; charset=utf-8']);
    const plain = httpsUrl(formats['text/plain; charset=utf-8']) || httpsUrl(formats['text/plain']);
    const pdf = httpsUrl(formats['application/pdf']);
    const sourceUrl = `https://www.gutenberg.org/ebooks/${id}`;
    const assets = safeAssets([
      epub ? { kind: 'ebook', url: epub, label: 'EPUB', mimeType: 'application/epub+zip', playable: false } : undefined,
      html ? { kind: 'ebook', url: html, label: 'HTML', mimeType: 'text/html', playable: false } : undefined,
      plain ? { kind: 'ebook', url: plain, label: 'Plain text', mimeType: 'text/plain', playable: false } : undefined,
      pdf ? { kind: 'ebook', url: pdf, label: 'PDF', mimeType: 'application/pdf', playable: false } : undefined,
    ]);
    return {
      key: stableId(this.id, String(id)), provider: this.id, providerId: String(id), title,
      authors, description: asArray(raw.summaries).map(asText).filter(Boolean)[0],
      language: asArray(raw.languages).map(asText)[0], format: 'ebook', subjects,
      sourceUrl, coverUrl: httpsUrl(formats['image/jpeg']), isbn: undefined,
      chapters: [], assets,
      rights: sourceRights(raw.copyright === false ? 'us-public-domain' : raw.copyright === true ? 'copyrighted' : 'unspecified', sourceUrl),
      accessibility: { transcript: 'unknown', navigation: 'unknown' },
    };
  }
}
