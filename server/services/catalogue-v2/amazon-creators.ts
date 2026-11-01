import {
  type CatalogueAdapter, type CatalogueBook, type CataloguePage, type CatalogueQuery,
  asArray, asRecord, asText, httpsUrl, stableId, sourceRights,
} from './types';

/** Amazon Creators API (NOT deprecated PA-API 5). Server-side, read-only discovery. */
export interface AmazonCreatorsConfig {
  credentialId: string;
  credentialSecret: string;
  credentialVersion: '2.1' | '2.2' | '2.3' | '3.1' | '3.2' | '3.3';
  partnerTag: string;
}

const tokenEndpoints: Record<AmazonCreatorsConfig['credentialVersion'], string> = {
  '2.1': 'https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token',
  '2.2': 'https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token',
  '2.3': 'https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token',
  '3.1': 'https://api.amazon.com/auth/o2/token',
  '3.2': 'https://api.amazon.co.uk/auth/o2/token',
  '3.3': 'https://api.amazon.co.jp/auth/o2/token',
};
const MARKETPLACE = 'www.amazon.com.au';
const API_BASE = 'https://creatorsapi.amazon/catalog/v1';

export function amazonCreatorsConfigFromEnv(env: Record<string, string | undefined> = process.env): AmazonCreatorsConfig | null {
  // Operator-signed release gate: configuring credentials alone must not enable Amazon content.
  // Verify Amazon Associates website/mobile approval and intended site purpose before setting flags.
  if (env.AMAZON_CREATORS_ENABLED !== 'true' || env.AMAZON_CREATORS_POLICY_APPROVED !== 'true') return null;
  const version = env.AMAZON_CREATORS_VERSION;
  if (!version || !(version in tokenEndpoints) || !env.AMAZON_CREATORS_CREDENTIAL_ID ||
      !env.AMAZON_CREATORS_CREDENTIAL_SECRET || !env.AMAZON_ASSOCIATES_AU_TAG) return null;
  return {
    credentialVersion: version as AmazonCreatorsConfig['credentialVersion'],
    credentialId: env.AMAZON_CREATORS_CREDENTIAL_ID,
    credentialSecret: env.AMAZON_CREATORS_CREDENTIAL_SECRET,
    partnerTag: env.AMAZON_ASSOCIATES_AU_TAG,
  };
}

/** Never link to arbitrary host or take a URL from a user-controlled API parameter. */
export function safeAmazonProductUrl(value: unknown): string | undefined {
  const url = httpsUrl(value);
  if (!url) return undefined;
  const parsed = new URL(url);
  return ['www.amazon.com.au', 'amazon.com.au'].includes(parsed.hostname.toLowerCase()) &&
    /^\/(dp\/|gp\/product\/)/.test(parsed.pathname) ? url : undefined;
}
export function safeAmazonCoverUrl(value: unknown): string | undefined {
  const url = httpsUrl(value);
  if (!url) return undefined;
  const host = new URL(url).hostname.toLowerCase();
  return host === 'm.media-amazon.com' || host === 'images-na.ssl-images-amazon.com' ? url : undefined;
}

export class AmazonCreatorsAdapter implements CatalogueAdapter {
  readonly id = 'amazon-creators' as const;
  readonly name = 'Amazon Books (Australia)';
  readonly supportsBulkSync = false;
  private token: { value: string; expiresAt: number } | null = null;
  private pendingToken: Promise<string> | null = null;

  constructor(private readonly config: AmazonCreatorsConfig, private readonly fetchFn: typeof fetch = fetch) {
    if (!(config.credentialVersion in tokenEndpoints) || !config.credentialId ||
        !config.credentialSecret || !config.partnerTag) throw new Error('Invalid Amazon Creators API configuration');
  }

  private async jsonPost(url: string, headers: Record<string, string>, body: string): Promise<Record<string, any>> {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await this.fetchFn(url, {
          method: 'POST', headers, body, signal: AbortSignal.timeout(15_000), redirect: 'error',
        });
      } catch {
        if (attempt === 0) continue;
        throw new Error('Amazon Creators API network request failed');
      }
      if (response.ok) return asRecord(await response.json());
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        // One bounded retry; avoid aggressive polling of a credential-gated service.
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      // Deliberately do not include response body, URL or secrets in public errors or logs.
      throw new Error(`Amazon Creators API temporarily unavailable (${response.status})`);
    }
    throw new Error('Amazon Creators API unavailable');
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() + 60_000 < this.token.expiresAt) return this.token.value;
    if (this.pendingToken) return this.pendingToken;
    this.pendingToken = (async () => {
      const isV2 = this.config.credentialVersion.startsWith('2.');
      const payload = isV2
        ? new URLSearchParams({ grant_type: 'client_credentials', client_id: this.config.credentialId,
          client_secret: this.config.credentialSecret, scope: 'creatorsapi/default' }).toString()
        : JSON.stringify({ grant_type: 'client_credentials', client_id: this.config.credentialId,
          client_secret: this.config.credentialSecret, scope: 'creatorsapi::default' });
      const tokenData = await this.jsonPost(tokenEndpoints[this.config.credentialVersion],
        { 'Content-Type': isV2 ? 'application/x-www-form-urlencoded' : 'application/json' }, payload);
      const token = asText(tokenData.access_token);
      if (!token || token.length > 8192) throw new Error('Invalid Amazon Creators API token response');
      const seconds = Number(tokenData.expires_in);
      this.token = { value: token, expiresAt: Date.now() +
        (Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) : 3600) * 1000 };
      return token;
    })();
    try { return await this.pendingToken; }
    finally { this.pendingToken = null; }
  }

  private async callOperation(operation: 'searchItems' | 'getItems', payload: object): Promise<Record<string, any>> {
    const token = await this.accessToken();
    const authorization = this.config.credentialVersion.startsWith('2.')
      ? `Bearer ${token}, Version ${this.config.credentialVersion}` : `Bearer ${token}`;
    return this.jsonPost(`${API_BASE}/${operation}`, {
      'Content-Type': 'application/json', Authorization: authorization, 'x-marketplace': MARKETPLACE,
    }, JSON.stringify({ ...payload, marketplace: MARKETPLACE, partnerTag: this.config.partnerTag }));
  }

  normalize(value: unknown): CatalogueBook | null {
    const raw = asRecord(value);
    const asin = asText(raw.asin).toUpperCase();
    const detailUrl = safeAmazonProductUrl(raw.detailPageURL);
    const itemInfo = asRecord(raw.itemInfo);
    const title = asText(asRecord(itemInfo.title).displayValue);
    // Only present approved partner links to books. Never invent offer price/availability.
    if (!/^[A-Z0-9]{10}$/.test(asin) || !detailUrl || !title) return null;
    const byLine = asRecord(itemInfo.byLineInfo);
    const contributors = asArray(byLine.contributors)
      .map(v => asText(asRecord(v).name)).filter(Boolean).slice(0, 20);
    const ids = asRecord(itemInfo.externalIds);
    const isbns = asArray(asRecord(ids.isbns).displayValues).map(asText);
    const medium = asRecord(asRecord(asRecord(raw.images).primary).medium);
    const large = asRecord(asRecord(asRecord(raw.images).primary).large);
    return {
      key: stableId(this.id, asin), provider: this.id, providerId: asin,
      title, authors: contributors, isbn: isbns.find(v => /^\d{10,13}$/.test(v)),
      format: 'metadata', subjects: [], coverUrl: safeAmazonCoverUrl(large.url) || safeAmazonCoverUrl(medium.url),
      sourceUrl: detailUrl, chapters: [], assets: [], rights: sourceRights('copyrighted', detailUrl),
      accessibility: { transcript: 'unknown', navigation: 'unknown' },
    };
  }

  async search(query: CatalogueQuery): Promise<CataloguePage> {
    if (!query.query.trim() || query.format) return { items: [], nextCursor: null };
    const itemCount = Math.min(10, Math.max(1, query.limit));
    const page = query.cursor === undefined ? 1 : Number(query.cursor);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10) return { items: [], nextCursor: null };
    const data = await this.callOperation('searchItems', {
      keywords: query.query.slice(0, 120), searchIndex: 'Books', itemCount, itemPage: page,
      resources: ['images.primary.medium', 'images.primary.large', 'itemInfo.title',
        'itemInfo.byLineInfo', 'itemInfo.externalIds'],
    });
    const result = asRecord(data.searchResult);
    const items = asArray(result.items).map(v => this.normalize(v)).filter((v): v is CatalogueBook => !!v);
    const total = Math.max(0, Number(result.totalResultCount) || 0);
    return { items, total, nextCursor: page < 10 && page * itemCount < total ? String(page + 1) : null };
  }

  async getBook(providerId: string): Promise<CatalogueBook | null> {
    if (!/^[A-Z0-9]{10}$/.test(providerId)) return null;
    const data = await this.callOperation('getItems', {
      itemIds: [providerId], itemIdType: 'ASIN',
      resources: ['images.primary.medium', 'images.primary.large', 'itemInfo.title',
        'itemInfo.byLineInfo', 'itemInfo.externalIds'],
    });
    return this.normalize(asArray(asRecord(data.itemsResult).items)[0]);
  }
}
