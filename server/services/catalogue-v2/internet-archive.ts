import { CatalogueHttpError, PoliteHttpClient } from './http';
import {
  type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery, type CatalogueAsset, type JsonFetcher,
  asRecord, asArray, asText, asPositiveInt, httpsUrl, parseCursor, stableId, sourceRights, safeAssets,
} from './types';

const oneOrMany = (value: unknown): string[] => (Array.isArray(value) ? value : value === undefined ? [] : [value])
  .map(asText).filter(Boolean);
function archiveQuery(value: string): string {
  return value.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, '\\$&').slice(0, 120);
}
function archiveFileUrl(id: string, fileName: string): string | undefined {
  if (!fileName || fileName.includes('..') || /[\x00-\x1f]/.test(fileName)) return undefined;
  return httpsUrl(`https://archive.org/download/${encodeURIComponent(id)}/${fileName.split('/').map(encodeURIComponent).join('/')}`);
}

/** Search returns catalogue metadata. Only the detail endpoint can discover real filenames. */
export class InternetArchiveAdapter implements CatalogueAdapter {
  readonly id = 'internet-archive' as const;
  readonly name = 'Internet Archive';
  readonly supportsBulkSync = false;
  private readonly getJson: JsonFetcher;
  constructor(getJson?: JsonFetcher) {
    const client = new PoliteHttpClient({ minIntervalMs: 2000 });
    this.getJson = getJson || ((url) => client.json(url));
  }
  async search(query: CatalogueQuery): Promise<CataloguePage> {
    if (!query.query.trim()) return { items: [], nextCursor: null };
    const limit = Math.min(40, Math.max(1, query.limit));
    const offset = parseCursor(query.cursor);
    // Advanced Search only supports 10,000 sorted results; no deep full-catalogue mirroring.
    if (offset >= 10000) return { items: [], nextCursor: null };
    const media = query.format === 'audiobook' ? 'mediatype:audio'
      : query.format === 'ebook' ? 'mediatype:texts' : '(mediatype:audio OR mediatype:texts)';
    const q = `(title:("${archiveQuery(query.query)}") OR description:("${archiveQuery(query.query)}")) AND ${media}`;
    const url = new URL('https://archive.org/advancedsearch.php');
    url.searchParams.set('q', q);
    url.searchParams.set('output', 'json');
    url.searchParams.set('rows', String(limit));
    url.searchParams.set('page', String(Math.floor(offset / limit) + 1));
    for (const field of ['identifier', 'title', 'creator', 'description', 'subject', 'language', 'mediatype', 'downloads']) {
      url.searchParams.append('fl[]', field);
    }
    const payload = asRecord(await this.getJson(url.toString()));
    const result = asRecord(payload.response);
    const items = asArray(result.docs).map((v: unknown) => this.normalize(v)).filter((v): v is CatalogueBook => !!v);
    const total = Number(result.numFound) || 0;
    return { items, total,
      nextCursor: offset + items.length < Math.min(total, 10_000) && items.length === limit
        ? String(offset + items.length) : null };
  }
  async getBook(providerId: string): Promise<CatalogueBook | null> {
    if (!/^[A-Za-z0-9._-]{1,150}$/.test(providerId)) return null;
    try {
      const payload = asRecord(await this.getJson(`https://archive.org/metadata/${providerId}`));
      const metadata = asRecord(payload.metadata);
      return this.normalize({ ...metadata, identifier: providerId }, asArray(payload.files));
    } catch (error) {
      if (error instanceof CatalogueHttpError && error.status === 404) return null;
      throw error;
    }
  }
  normalize(value: unknown, files: unknown[] = []): CatalogueBook | null {
    const raw = asRecord(value);
    const id = asText(raw.identifier), title = asText(raw.title);
    if (!/^[A-Za-z0-9._-]{1,150}$/.test(id) || !title) return null;
    const sourceUrl = `https://archive.org/details/${encodeURIComponent(id)}`;
    const format = asText(raw.mediatype) === 'audio' ? 'audiobook'
      : asText(raw.mediatype) === 'texts' ? 'ebook' : 'metadata';
    const assets: Array<CatalogueAsset | undefined> = files.map((v: unknown) => {
      const file = asRecord(v), name = asText(file.name), kind = asText(file.format).toLowerCase();
      const url = archiveFileUrl(id, name);
      if (!url) return undefined;
      if (kind === 'vbr mp3' || kind === '64kbps mp3' || kind === '128kbps mp3' || kind === 'mp3')
        return { kind: 'audio-track', url, label: name, mimeType: 'audio/mpeg', playable: true };
      if (kind.includes('ogg vorbis'))
        return { kind: 'audio-track', url, label: name, mimeType: 'audio/ogg', playable: true };
      if (kind === 'epub')
        return { kind: 'ebook', url, label: name, mimeType: 'application/epub+zip', playable: false };
      if (kind === 'text pdf' || kind === 'pdf')
        return { kind: 'ebook', url, label: name, mimeType: 'application/pdf', playable: false };
      return undefined;
    });
    return {
      key: stableId(this.id, id), provider: this.id, providerId: id, title,
      authors: oneOrMany(raw.creator), description: oneOrMany(raw.description)[0],
      language: oneOrMany(raw.language)[0], format, subjects: oneOrMany(raw.subject).slice(0, 25),
      sourceUrl, chapters: [], assets: safeAssets(assets),
      rights: sourceRights('unspecified', sourceUrl),
      accessibility: { transcript: 'unknown', navigation: 'unknown' },
    };
  }
}
