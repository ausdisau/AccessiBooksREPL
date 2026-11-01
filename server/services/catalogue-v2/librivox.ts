import { CatalogueHttpError, PoliteHttpClient } from './http';
import {
  type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery,
  type JsonFetcher, type CatalogueChapter, type CatalogueAsset,
  asRecord, asArray, asText, asNonnegativeInt, asPositiveInt, httpsUrl, parseCursor,
  stableId, sourceRights, safeAssets,
} from './types';

/** The LibriVox audiobook API caps limit at 500; do not remove the 4s throttle. */
export class LibriVoxAdapter implements CatalogueAdapter {
  readonly id = 'librivox' as const;
  readonly name = 'LibriVox';
  readonly supportsBulkSync = true;
  private readonly getJson: JsonFetcher;
  constructor(getJson?: JsonFetcher) {
    const client = new PoliteHttpClient({ minIntervalMs: 4_000 });
    this.getJson = getJson || ((url) => client.json(url));
  }
  private baseUrl(): URL {
    const u = new URL('https://librivox.org/api/feed/audiobooks/');
    u.searchParams.set('format', 'json');
    u.searchParams.set('extended', '1');
    u.searchParams.set('coverart', '1');
    return u;
  }
  private async fetchPage(url: URL, limit: number, cursor?: string, notFoundIsEmpty = false): Promise<CataloguePage> {
    url.searchParams.set('limit', String(Math.max(1, Math.min(500, limit))));
    url.searchParams.set('offset', String(parseCursor(cursor)));
    try {
      const payload = asRecord(await this.getJson(url.toString()));
      if (!Array.isArray(payload.books)) throw new Error('LibriVox returned an unexpected catalogue payload');
      const items = payload.books.map((raw: unknown) => this.normalize(raw)).filter((v): v is CatalogueBook => !!v);
      const offset = parseCursor(cursor);
      return { items, nextCursor: payload.books.length >= limit ? String(offset + payload.books.length) : null };
    } catch (error) {
      // LibriVox can signal the end of its catalogue as a 404, not a JSON empty array.
      if (error instanceof CatalogueHttpError && error.status === 404 && (cursor !== undefined || notFoundIsEmpty)) {
        return { items: [], nextCursor: null };
      }
      throw error;
    }
  }
  async search(query: CatalogueQuery): Promise<CataloguePage> {
    const url = this.baseUrl();
    if (query.format === 'ebook') return { items: [], nextCursor: null };
    if (query.query) url.searchParams.set('title', query.query);
    const page = await this.fetchPage(url, Math.min(100, query.limit), query.cursor, true);
    if (query.language) {
      page.items = page.items.filter(book => (book.language || '').toLowerCase().startsWith(query.language!.toLowerCase()));
    }
    return page;
  }
  async listPage(cursor: string | undefined, limit: number): Promise<CataloguePage> {
    const url = this.baseUrl();
    url.searchParams.set('sort_order', 'asc');
    return this.fetchPage(url, Math.min(500, limit), cursor);
  }
  async getBook(providerId: string): Promise<CatalogueBook | null> {
    if (!/^\d{1,10}$/.test(providerId)) return null;
    const url = this.baseUrl();
    url.searchParams.set('id', providerId);
    url.searchParams.set('limit', '1');
    try {
      const payload = asRecord(await this.getJson(url.toString()));
      return this.normalize(asArray(payload.books)[0]);
    } catch (error) {
      if (error instanceof CatalogueHttpError && error.status === 404) return null;
      throw error;
    }
  }
  normalize(value: unknown): CatalogueBook | null {
    const raw = asRecord(value);
    const id = asText(String(raw.id ?? ''));
    const title = asText(raw.title);
    if (!/^\d+$/.test(id) || !title) return null;
    const authors = asArray(raw.authors).map((a: unknown) => {
      const author = asRecord(a);
      return `${asText(author.first_name)} ${asText(author.last_name)}`.trim();
    }).filter(Boolean);
    const subjects = asArray(raw.genres).map((g: unknown) => asText(asRecord(g).name)).filter(Boolean);
    const durationSeconds = asNonnegativeInt(raw.totaltimesecs);
    const chapters: CatalogueChapter[] = asArray(raw.sections).flatMap((section: unknown, index: number) => {
      const s = asRecord(section);
      const url = httpsUrl(s.listen_url);
      const audio: CatalogueAsset | undefined = url
        ? { kind: 'audio-track', url, label: `Section ${index + 1}`, playable: true, mimeType: 'audio/mpeg' }
        : undefined;
      const narrators = asArray(s.readers).map((r: unknown) => {
        const reader = asRecord(r);
        return `${asText(reader.display_name) || `${asText(reader.first_name)} ${asText(reader.last_name)}`.trim()}`.trim();
      }).filter(Boolean);
      return [{ sequence: asPositiveInt(s.section_number) || index + 1, title: asText(s.title) || `Section ${index + 1}`,
        durationSeconds: asNonnegativeInt(s.playtime) ?? asNonnegativeInt(s.playtime_secs), narratorNames: narrators, audio }];
    });
    const archive = httpsUrl(raw.url_zip_file);
    const assets = safeAssets([
      ...chapters.map(c => c.audio),
      archive ? { kind: 'audio-archive', url: archive, label: 'Complete audiobook ZIP', playable: false, mimeType: 'application/zip' } : undefined,
    ]);
    const sourceUrl = httpsUrl(raw.url_librivox) || httpsUrl(raw.url_project);
    const coverUrl = httpsUrl(raw.coverart_jpg) || httpsUrl(raw.coverart_thumbnail);
    return {
      key: stableId(this.id, id), provider: this.id, providerId: id, title, authors,
      description: asText(raw.description), language: asText(raw.language) || undefined,
      format: 'audiobook', subjects, sourceUrl, coverUrl, durationSeconds,
      chapters, assets,
      rights: sourceRights('us-public-domain', sourceUrl),
      accessibility: { transcript: 'unknown', navigation: chapters.length > 0 ? 'verified' : 'unknown' },
    };
  }
}
