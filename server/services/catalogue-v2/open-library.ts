import { CatalogueHttpError, PoliteHttpClient } from './http';
import {
  type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery, type JsonFetcher,
  asArray, asRecord, asText, asPositiveInt, parseCursor, stableId, sourceRights,
} from './types';

/** Open Library is metadata-first; lending/borrow status does not grant file rights. */
export class OpenLibraryAdapter implements CatalogueAdapter {
  readonly id = 'open-library' as const;
  readonly name = 'Open Library';
  readonly supportsBulkSync = false;
  private readonly getJson: JsonFetcher;
  constructor(getJson?: JsonFetcher) {
    const client = new PoliteHttpClient({ minIntervalMs: 1000 });
    this.getJson = getJson || ((url) => client.json(url));
  }
  async search(query: CatalogueQuery): Promise<CataloguePage> {
    if (!query.query.trim() || query.format === 'audiobook') return { items: [], nextCursor: null };
    const limit = Math.min(40, Math.max(1, query.limit));
    const offset = parseCursor(query.cursor);
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', query.query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('fields', 'key,title,author_name,first_publish_year,language,cover_i,subject,isbn');
    if (query.language) url.searchParams.set('language', query.language);
    const payload = asRecord(await this.getJson(url.toString()));
    const items = asArray(payload.docs).map((v: unknown) => this.normalize(v)).filter((v): v is CatalogueBook => !!v);
    const total = Number(payload.numFound ?? payload.num_found) || 0;
    return { items: items, total,
      nextCursor: offset + items.length < total && items.length === limit ? String(offset + items.length) : null };
  }
  async getBook(providerId: string): Promise<CatalogueBook | null> {
    if (!/^OL\d+W$/.test(providerId)) return null;
    try {
      const raw = await this.getJson(`https://openlibrary.org/works/${providerId}.json`);
      return this.normalize({ ...asRecord(raw), key: `/works/${providerId}` });
    } catch (error) {
      if (error instanceof CatalogueHttpError && error.status === 404) return null;
      throw error;
    }
  }
  normalize(value: unknown): CatalogueBook | null {
    const raw = asRecord(value);
    const key = asText(raw.key), id = key.replace(/^\/works\//, '');
    const title = asText(raw.title);
    if (!/^OL\d+W$/.test(id) || !title) return null;
    const sourceUrl = `https://openlibrary.org/works/${id}`;
    const cover = asPositiveInt(raw.cover_i) || asPositiveInt(asArray(raw.covers)[0]);
    const subjects = asArray(raw.subject).map(asText).filter(Boolean).slice(0, 25);
    const desc = typeof raw.description === 'string' ? raw.description : asText(asRecord(raw.description).value);
    // Work metadata may not include author names; never fabricate an author from a reference id.
    return {
      key: stableId(this.id, id), provider: this.id, providerId: id, title,
      authors: asArray(raw.author_name).map(asText).filter(Boolean),
      description: desc || undefined,
      language: asArray(raw.language).map(asText)[0], format: 'metadata', subjects,
      sourceUrl, coverUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg` : undefined,
      isbn: asArray(raw.isbn).map(asText)[0], chapters: [], assets: [],
      rights: sourceRights('unspecified', sourceUrl),
      accessibility: { transcript: 'unknown', navigation: 'unknown' },
    };
  }
}
