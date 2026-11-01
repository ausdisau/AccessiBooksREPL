import { CatalogueHttpError, PoliteHttpClient } from './http';
import {
  type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery, type JsonFetcher,
  asRecord, asArray, asText, httpsUrl, parseCursor, stableId, sourceRights, safeAssets,
} from './types';

/** Google Books volume metadata and preview links; not full-text redistribution. */
export class GoogleBooksAdapter implements CatalogueAdapter {
  readonly id = 'google-books' as const;
  readonly name = 'Google Books';
  readonly supportsBulkSync = false;
  private readonly getJson: JsonFetcher;
  constructor(getJson?: JsonFetcher) {
    const client = new PoliteHttpClient({ minIntervalMs: 1000 });
    this.getJson = getJson || ((url) => client.json(url));
  }
  async search(query: CatalogueQuery): Promise<CataloguePage> {
    if (!query.query.trim() || query.format === 'audiobook') return { items: [], nextCursor: null };
    const limit = Math.max(1, Math.min(40, query.limit));
    const offset = parseCursor(query.cursor);
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query.query);
    url.searchParams.set('maxResults', String(limit));
    url.searchParams.set('startIndex', String(offset));
    url.searchParams.set('printType', 'books');
    if (query.language) url.searchParams.set('langRestrict', query.language);
    if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY);
    const payload = asRecord(await this.getJson(url.toString()));
    const items = asArray(payload.items).map((item: unknown) => this.normalize(item)).filter((b): b is CatalogueBook => !!b);
    const total = Number(payload.totalItems) || 0;
    return { items: items, total,
      nextCursor: offset + items.length < total && items.length === limit ? String(offset + items.length) : null };
  }
  async getBook(providerId: string): Promise<CatalogueBook | null> {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(providerId)) return null;
    const url = new URL(`https://www.googleapis.com/books/v1/volumes/${providerId}`);
    if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY);
    try { return this.normalize(await this.getJson(url.toString())); }
    catch (error) {
      if (error instanceof CatalogueHttpError && error.status === 404) return null;
      throw error;
    }
  }
  normalize(value: unknown): CatalogueBook | null {
    const raw = asRecord(value), v = asRecord(raw.volumeInfo), access = asRecord(raw.accessInfo);
    const id = asText(raw.id), title = asText(v.title);
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || !title) return null;
    const sourceUrl = httpsUrl(v.infoLink) || `https://books.google.com/books?id=${encodeURIComponent(id)}`;
    const preview = httpsUrl(v.previewLink) || httpsUrl(access.webReaderLink);
    const assets = safeAssets([
      preview ? { kind: 'preview', url: preview, label: 'Preview on Google Books', playable: false } : undefined,
    ]);
    const identifiers = asArray(v.industryIdentifiers);
    const isbn = identifiers.map((i: unknown) => asRecord(i)).find(i => i.type === 'ISBN_13')?.identifier;
    const cover = asRecord(v.imageLinks);
    return {
      key: stableId(this.id, id), provider: this.id, providerId: id, title,
      authors: asArray(v.authors).map(asText).filter(Boolean),
      description: asText(v.description), language: asText(v.language) || undefined,
      format: 'metadata', subjects: asArray(v.categories).map(asText).filter(Boolean),
      sourceUrl, coverUrl: httpsUrl(cover.thumbnail) || httpsUrl(cover.smallThumbnail),
      isbn: asText(isbn) || undefined, chapters: [], assets,
      rights: sourceRights('unspecified', sourceUrl),
      accessibility: { transcript: 'unknown', navigation: 'unknown' },
    };
  }
}
