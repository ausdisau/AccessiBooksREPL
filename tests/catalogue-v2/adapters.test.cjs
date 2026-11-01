/** Tests require `tsc`-transpiled catalogue-v2 core to be in CATALOGUE_BUILD. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.env.CATALOGUE_BUILD || '/mnt/data/accessibooks_adapter_compiled';
const fromBuild = name => require(path.join(root, name + '.js'));
const { LibriVoxAdapter } = fromBuild('librivox');
const { GutenbergAdapter } = fromBuild('gutenberg');
const { InternetArchiveAdapter } = fromBuild('internet-archive');
const { GoogleBooksAdapter } = fromBuild('google-books');
const { OpenLibraryAdapter } = fromBuild('open-library');
const { AmazonCreatorsAdapter, safeAmazonProductUrl, amazonCreatorsConfigFromEnv } = fromBuild('amazon-creators');
const { CatalogueRegistry } = fromBuild('registry');
const { PoliteHttpClient, CatalogueHttpError } = fromBuild('http');
const { httpsUrl, parseCursor } = fromBuild('types');

const livri = {
  id: '52', title: 'The Book', description: 'An audiobook', language: 'English',
  url_librivox: 'https://librivox.org/the-book/',
  url_zip_file: 'https://archive.org/download/book_52_librivox/book_52_librivox_64kb_mp3.zip',
  authors: [{ first_name: 'Jane', last_name: 'Doe' }],
  sections: [
    { id: '10', section_number: '1', title: 'Chapter One', listen_url: 'https://archive.org/download/book_52_librivox/chapter01.mp3', readers: [{ display_name: 'Alex' }] },
    { id: '11', section_number: '2', title: 'Chapter Two', listen_url: 'javascript:alert(1)' },
  ],
  genres: [{ name: 'Fiction' }], totaltimesecs: 3600,
};

test('LibriVox maps native sections and never marks ZIP playable', async () => {
  const calls = [];
  const adapter = new LibriVoxAdapter(async url => { calls.push(new URL(url)); return { books: [livri] }; });
  const result = await adapter.search({ query: 'Book', limit: 25 });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].key, 'librivox:52');
  assert.equal(result.items[0].durationSeconds, 3600);
  assert.equal(result.items[0].rights.auStatus, 'review-required');
  assert.equal(result.items[0].chapters[0].narratorNames[0], 'Alex');
  assert.equal(result.items[0].assets.filter(a => a.kind === 'audio-track').length, 1);
  assert.equal(result.items[0].assets.filter(a => a.kind === 'audio-archive')[0].playable, false);
  assert.equal(calls[0].searchParams.get('extended'), '1');
  assert.equal(calls[0].searchParams.get('title'), 'Book');
});

test('LibriVox pagination works at 500 and separate same-title recordings stay distinct', async () => {
  const first = Array.from({ length: 500 }, (_, i) => ({ ...livri, id: String(i + 1) }));
  const adapter = new LibriVoxAdapter(async url => {
    return { books: Number(new URL(url).searchParams.get('offset')) === 0 ? first : [] };
  });
  const page1 = await adapter.listPage(undefined, 1000);
  assert.equal(page1.items.length, 500);
  assert.equal(page1.nextCursor, '500');
  assert.equal(new Set(page1.items.map(b => b.key)).size, 500);
  const page2 = await adapter.listPage(page1.nextCursor, 500);
  assert.equal(page2.nextCursor, null);
});

test('Gutenberg preserves ebook formats, stable project ID, and AU needs-review status', async () => {
  const adapter = new GutenbergAdapter(async () => ({
    results: [{ id: 1342, title: 'Pride and Prejudice', authors: [{ name: 'Austen, Jane' }],
      languages: ['en'], copyright: false, formats: {
        'application/epub+zip': 'https://www.gutenberg.org/ebooks/1342.epub.images',
        'text/html': 'https://www.gutenberg.org/ebooks/1342.html.images',
        'image/jpeg': 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
      } }], count: 123, next: 'https://gutendex.com/books?page=2',
  }));
  const page = await adapter.listPage(undefined, 32);
  assert.equal(page.items[0].key, 'gutenberg:1342');
  assert.equal(page.items[0].assets[0].kind, 'ebook');
  assert.equal(page.items[0].assets[0].playable, false);
  assert.equal(page.items[0].rights.sourceStatement, 'us-public-domain');
  assert.equal(page.items[0].rights.auStatus, 'review-required');
  assert.equal(page.nextCursor, '2');
});

test('Internet Archive search never guesses MP3/PDF filenames', async () => {
  const adapter = new InternetArchiveAdapter(async () => ({
    response: { docs: [{ identifier: 'sample_item', title: 'Sample', creator: ['Someone'], mediatype: 'audio' }], numFound: 1 },
  }));
  const page = await adapter.search({ query: 'Sample', limit: 20 });
  assert.equal(page.items[0].assets.length, 0);
  assert.equal(page.items[0].format, 'audiobook');
});

test('Internet Archive details use verified filenames and reject traversal', async () => {
  const adapter = new InternetArchiveAdapter(async () => ({
    metadata: { title: 'Sample Audio', mediatype: 'audio', creator: 'Someone' },
    files: [
      { name: 'first session.mp3', format: 'VBR MP3' },
      { name: 'lesson.epub', format: 'EPUB' },
      { name: '../secret.mp3', format: 'MP3' },
      { name: 'sample_meta.xml', format: 'Metadata' },
    ],
  }));
  const book = await adapter.getBook('item-1');
  assert.equal(book.assets.length, 2);
  assert.match(book.assets[0].url, /first%20session\.mp3$/);
  assert.equal(book.assets[0].playable, true);
  assert.equal(book.rights.auStatus, 'review-required');
});

test('Google Books exposes only external preview, not paid text as an ebook download', async () => {
  const adapter = new GoogleBooksAdapter(async url => ({
    totalItems: 1,
    items: [{ id: 'abc_12', volumeInfo: { title: 'A Book', authors: ['Author'], previewLink: 'https://books.google.com/preview/abc_12', industryIdentifiers: [{ type: 'ISBN_13', identifier: '9781234567890' }] },
      accessInfo: { epub: { isAvailable: true, acsTokenLink: 'https://books.google.com/paidfile' } } }],
  }));
  const page = await adapter.search({ query: 'A Book', limit: 20 });
  assert.equal(page.items[0].format, 'metadata');
  assert.deepEqual(page.items[0].assets.map(a => a.kind), ['preview']);
  assert.equal(page.items[0].isbn, '9781234567890');
});

test('Open Library does not invent reader links or copyrights', async () => {
  const adapter = new OpenLibraryAdapter(async () => ({ docs: [{ key: '/works/OL123W', title: 'Example', author_name: ['A. Reader'], cover_i: 123 }], numFound: 1 }));
  const page = await adapter.search({ query: 'Example', limit: 5 });
  assert.equal(page.items[0].key, 'open-library:OL123W');
  assert.equal(page.items[0].assets.length, 0);
  assert.equal(page.items[0].rights.sourceStatement, 'unspecified');
});

test('Provider IDs do not allow a URL to be injected into an outbound request', async () => {
  let called = false;
  const adapter = new InternetArchiveAdapter(async () => { called = true; return {}; });
  assert.equal(await adapter.getBook('https://evil.example/metadata'), null);
  assert.equal(called, false);
  assert.equal(httpsUrl('javascript:alert(1)'), undefined);
  assert.throws(() => parseCursor('1e7'), /Invalid/);
});

test('Registry isolates provider errors and deduplicates source/record identity only', async () => {
  const adapter = new LibriVoxAdapter(async () => ({ books: [livri] }));
  const failing = new GutenbergAdapter(async () => { throw new Error('offline'); });
  const registry = new CatalogueRegistry([adapter, failing]);
  const result = await registry.search(['librivox', 'librivox', 'gutenberg'], { query: 'The Book', limit: 20 });
  assert.equal(result.items.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].provider, 'gutenberg');
  assert.equal(result.nextCursors.librivox, null);
});

test('Polite HTTP client retries 429 and retains a bounded fetch count', async () => {
  let calls = 0;
  const client = new PoliteHttpClient({ minIntervalMs: 0, retries: 1, sleep: async () => {},
    fetchFn: async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 429, headers: { get: () => null } };
      return { ok: true, json: async () => ({ good: true }) };
    },
  });
  const data = await client.json('https://example.org/catalogue');
  assert.equal(data.good, true);
  assert.equal(calls, 2);
});


test('Amazon Creators API AU search uses token caching, v3.3 OAuth and real affiliate product URLs', async () => {
  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, headers: init.headers, body: init.body });
    if (url.endsWith('/auth/o2/token')) return { ok: true, json: async () => ({ access_token: 'test-token', expires_in: 3600 }) };
    return { ok: true, json: async () => ({ searchResult: { totalResultCount: 1, items: [
      { asin: '1234567890', detailPageURL: 'https://www.amazon.com.au/dp/1234567890?tag=approved-22',
        itemInfo: { title: { displayValue: 'An Example Book' },
          byLineInfo: { contributors: [{ name: 'A. Writer' }] } },
        images: { primary: { medium: { url: 'https://m.media-amazon.com/images/I/example.jpg' } } } },
    ] } }) };
  };
  const adapter = new AmazonCreatorsAdapter({ credentialId: 'id', credentialSecret: 'secret',
    credentialVersion: '3.3', partnerTag: 'approved-22' }, mockFetch);
  const result = await adapter.search({ query: 'Example Book', limit: 20 });
  assert.equal(result.items[0].key, 'amazon-creators:1234567890');
  assert.equal(result.items[0].authors[0], 'A. Writer');
  assert.equal(result.items[0].format, 'metadata');
  assert.deepEqual(result.items[0].assets, []);
  assert.equal(result.items[0].rights.auStatus, 'review-required');
  assert.equal(result.items[0].sourceUrl, 'https://www.amazon.com.au/dp/1234567890?tag=approved-22');
  assert.equal(calls[0].url, 'https://api.amazon.co.jp/auth/o2/token');
  assert.equal(JSON.parse(calls[0].body).scope, 'creatorsapi::default');
  assert.equal(calls[1].url, 'https://creatorsapi.amazon/catalog/v1/searchItems');
  assert.equal(calls[1].headers['x-marketplace'], 'www.amazon.com.au');
  assert.equal(JSON.parse(calls[1].body).searchIndex, 'Books');
  assert.equal(JSON.parse(calls[1].body).itemCount, 10);
  await adapter.search({ query: 'Example Book', limit: 10 });
  assert.equal(calls.filter(c => c.url.endsWith('/auth/o2/token')).length, 1, 'token should be reused');
});

test('Amazon Creators API prevents host spoofing and rejects invalid ASINs', async () => {
  assert.equal(safeAmazonProductUrl('https://amazon.com.au.evil.invalid/dp/1234567890'), undefined);
  assert.equal(safeAmazonProductUrl('https://www.amazon.com.au/s?k=book'), undefined);
  const adapter = new AmazonCreatorsAdapter({ credentialId: 'id', credentialSecret: 'secret',
    credentialVersion: '3.3', partnerTag: 'tag-22' }, async () => { throw new Error('should not call'); });
  assert.equal(adapter.normalize({ asin: '1234567890', itemInfo: { title: { displayValue: 'Book' } },
    detailPageURL: 'https://www.amazon.com.au.evil.invalid/dp/1234567890' }), null);
  assert.equal(await adapter.getBook('https://malicious.example/'), null);
  assert.equal(amazonCreatorsConfigFromEnv({ AMAZON_CREATORS_VERSION: '3.3', AMAZON_CREATORS_CREDENTIAL_ID: 'id' }), null);
});

test('Amazon Creators API legacy v2.3 uses Cognito form token and Version header', async () => {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.endsWith('/oauth2/token')
      ? { access_token: 'token-2', expires_in: 3600 } : { searchResult: { totalResultCount: 0, items: [] } } };
  };
  const adapter = new AmazonCreatorsAdapter({ credentialId: 'id', credentialSecret: 'secret',
    credentialVersion: '2.3', partnerTag: 'tag-22' }, mockFetch);
  await adapter.search({ query: 'books', limit: 5 });
  assert.match(calls[0].url, /amazoncognito\.com\/oauth2\/token/);
  assert.match(calls[0].options.body, /scope=creatorsapi%2Fdefault/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer token-2, Version 2.3');
});


test('Amazon Creators API requires explicit independent approval and credentials, not just a switch', () => {
  const env = {
    AMAZON_CREATORS_ENABLED: 'true',
    AMAZON_CREATORS_POLICY_APPROVED: 'false',
    AMAZON_CREATORS_VERSION: '3.3',
    AMAZON_CREATORS_CREDENTIAL_ID: 'synthetic-id',
    AMAZON_CREATORS_CREDENTIAL_SECRET: 'synthetic-secret',
    AMAZON_ASSOCIATES_AU_TAG: 'synthetic-22',
  };
  assert.equal(amazonCreatorsConfigFromEnv(env), null);
  assert.equal(amazonCreatorsConfigFromEnv({ ...env, AMAZON_CREATORS_POLICY_APPROVED: 'true', AMAZON_ASSOCIATES_AU_TAG: '' }), null);
  assert.equal(amazonCreatorsConfigFromEnv({ ...env, AMAZON_CREATORS_ENABLED: 'false', AMAZON_CREATORS_POLICY_APPROVED: 'true' }), null);
  const approved = amazonCreatorsConfigFromEnv({ ...env, AMAZON_CREATORS_POLICY_APPROVED: 'true' });
  assert.equal(approved?.credentialVersion, '3.3');
  assert.equal(approved?.partnerTag, 'synthetic-22');
});
