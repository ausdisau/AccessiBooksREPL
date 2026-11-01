import { type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery, type ProviderId } from './types';
import { LibriVoxAdapter } from './librivox';
import { GutenbergAdapter } from './gutenberg';
import { GoogleBooksAdapter } from './google-books';
import { OpenLibraryAdapter } from './open-library';
import { InternetArchiveAdapter } from './internet-archive';
import { AmazonCreatorsAdapter, amazonCreatorsConfigFromEnv } from './amazon-creators';

export interface SearchResponse {
  items: CatalogueBook[];
  nextCursors: Partial<Record<ProviderId, string | null>>;
  errors: Array<{ provider: ProviderId; reason: string }>;
}
function defaultProviders(): CatalogueAdapter[] {
  const providers: CatalogueAdapter[] = [
    new LibriVoxAdapter(), new GutenbergAdapter(), new GoogleBooksAdapter(),
    new OpenLibraryAdapter(), new InternetArchiveAdapter(),
  ];
  const amazon = amazonCreatorsConfigFromEnv();
  if (amazon) providers.push(new AmazonCreatorsAdapter(amazon));
  return providers;
}

export class CatalogueRegistry {
  readonly providers: Map<ProviderId, CatalogueAdapter>;
  constructor(providers: CatalogueAdapter[] = defaultProviders()) { this.providers = new Map(providers.map(p => [p.id, p])); }
  listSources() {
    const active = Array.from(this.providers.values()).map(p => ({
      id: p.id, name: p.name, supportsBulkSync: p.supportsBulkSync,
      status: 'configured' as 'configured' | 'requires-credentials',
    }));
    if (!this.providers.has('amazon-creators')) active.push({
      id: 'amazon-creators', name: 'Amazon Books (Australia)', supportsBulkSync: false,
      status: 'requires-credentials',
    });
    return active;
  }
  async getBook(id: ProviderId, providerId: string): Promise<CatalogueBook | null> {
    const adapter = this.providers.get(id);
    if (!adapter) return null;
    return adapter.getBook(providerId);
  }
  async search(ids: ProviderId[], query: CatalogueQuery): Promise<SearchResponse> {
    const unique = [...new Set(ids)];
    const outcomes = await Promise.allSettled(unique.map(id => {
      const provider = this.providers.get(id);
      if (!provider) throw new Error('Unknown provider');
      return provider.search(query);
    }));
    const items: CatalogueBook[] = [];
    const nextCursors: SearchResponse['nextCursors'] = {};
    const errors: SearchResponse['errors'] = [];
    const seen = new Set<string>();
    outcomes.forEach((outcome, index) => {
      const id = unique[index];
      if (outcome.status === 'rejected') {
        errors.push({ provider: id, reason: 'Source temporarily unavailable' });
        return;
      }
      nextCursors[id] = outcome.value.nextCursor;
      for (const book of outcome.value.items) {
        if (seen.has(book.key)) continue;
        seen.add(book.key);
        items.push(book);
      }
    });
    // Preserve independent editions, translations and narration from other sources.
    return { items, nextCursors, errors };
  }
}
export const catalogueRegistry = new CatalogueRegistry();
