/** Canonical catalogue data shared by independent content providers. */
export type ProviderId = 'librivox' | 'gutenberg' | 'internet-archive' | 'google-books' | 'open-library' | 'amazon-creators';
export type PublicationFormat = 'audiobook' | 'ebook' | 'mixed' | 'metadata';
export type AssetKind = 'audio-track' | 'audio-archive' | 'ebook' | 'preview';

export interface CatalogueAsset {
  kind: AssetKind;
  url: string;
  label: string;
  mimeType?: string;
  /** A ZIP/landing page/preview is never treated as a playable audio stream. */
  playable: boolean;
}
export interface CatalogueChapter {
  sequence: number;
  title: string;
  durationSeconds?: number;
  narratorNames: string[];
  audio?: CatalogueAsset;
}
export interface CatalogueRights {
  /** Never infer Australian reuse permission from US public-domain metadata. */
  auStatus: 'review-required' | 'cleared' | 'restricted';
  sourceStatement: 'us-public-domain' | 'copyrighted' | 'unspecified';
  evidenceUrl?: string;
  license?: string;
}
export interface CatalogueBook {
  key: string; // provider:providerId. Distinct narrations/editions are not collapsed.
  provider: ProviderId;
  providerId: string;
  title: string;
  authors: string[];
  description?: string;
  language?: string;
  format: PublicationFormat;
  subjects: string[];
  sourceUrl?: string;
  coverUrl?: string;
  isbn?: string;
  durationSeconds?: number;
  chapters: CatalogueChapter[];
  assets: CatalogueAsset[];
  rights: CatalogueRights;
  /** No invented accessibility score or transcription claim. */
  accessibility: { transcript: 'verified' | 'unknown'; navigation: 'verified' | 'unknown' };
}
export interface CatalogueQuery {
  query: string;
  limit: number;
  cursor?: string;
  language?: string;
  format?: 'audiobook' | 'ebook';
}
export interface CataloguePage {
  items: CatalogueBook[];
  nextCursor: string | null;
  total?: number;
}
export interface CatalogueAdapter {
  readonly id: ProviderId;
  readonly name: string;
  readonly supportsBulkSync: boolean;
  search(query: CatalogueQuery): Promise<CataloguePage>;
  getBook(providerId: string): Promise<CatalogueBook | null>;
  /** Only sources with an enumerable API implement full catalogue iteration. */
  listPage?(cursor: string | undefined, limit: number): Promise<CataloguePage>;
}
export type JsonFetcher = (url: string) => Promise<unknown>;

export function asRecord(value: unknown): Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any> : {};
}
export function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}
export function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
export function asPositiveInt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}
export function asNonnegativeInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
}
export function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : undefined;
  } catch { return undefined; }
}
export function stableId(provider: ProviderId, id: string): string {
  return `${provider}:${id}`;
}
export function parseCursor(value: string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  if (!/^\d{1,8}$/.test(value)) throw new Error('Invalid pagination cursor');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > 10_000_000) throw new Error('Pagination cursor too large');
  return n;
}
export function authorNames(raw: unknown): string[] {
  return asArray(raw).map((value) => asText(value)).filter(Boolean).slice(0, 30);
}
export function sourceRights(sourceStatement: CatalogueRights['sourceStatement'], evidenceUrl?: string): CatalogueRights {
  return { auStatus: 'review-required', sourceStatement, evidenceUrl };
}
export function safeAssets(assets: Array<CatalogueAsset | undefined>): CatalogueAsset[] {
  const seen = new Set<string>();
  return assets.filter((asset): asset is CatalogueAsset => {
    if (!asset || !httpsUrl(asset.url) || seen.has(`${asset.kind}:${asset.url}`)) return false;
    seen.add(`${asset.kind}:${asset.url}`);
    return true;
  });
}
