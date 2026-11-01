import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, BookMarked, Headphones, ExternalLink, Search, LibraryBig, ShoppingBag,
  Upload, Grid2X2, List, SlidersHorizontal, Info, ArrowRight, RefreshCcw,
} from 'lucide-react';
import { parseGoodreadsExport, ratingForIsbn, MAX_GOODREADS_EXPORT_BYTES,
  type PersonalGoodreadsEntry } from '../lib/goodreads-export';
import './content-discovery.css';

type SourceId = 'librivox' | 'gutenberg' | 'internet-archive' | 'google-books' | 'open-library' | 'amazon-creators';
type Source = { id: SourceId; name: string; supportsBulkSync: boolean; status: 'configured' | 'requires-credentials' };
type CatalogueBook = {
  key: string; provider: SourceId; providerId: string; title: string; authors: string[];
  description?: string; language?: string; format: string; subjects: string[];
  sourceUrl?: string; coverUrl?: string; isbn?: string; durationSeconds?: number;
  chapters: Array<{ sequence: number; title: string; durationSeconds?: number; narratorNames?: string[] }>;
  assets: Array<{ kind: string; url: string; label: string; playable: boolean }>;
  rights: { auStatus: 'review-required' | 'cleared' | 'restricted'; sourceStatement: string };
};
type SearchResponse = { items: CatalogueBook[]; nextCursors?: Partial<Record<SourceId, string | null>>;
  errors?: Array<{ provider: SourceId; reason: string }> };
const labels: Record<SourceId, string> = {
  librivox: 'LibriVox', gutenberg: 'Project Gutenberg', 'internet-archive': 'Internet Archive',
  'google-books': 'Google Books', 'open-library': 'Open Library', 'amazon-creators': 'Amazon Books',
};
const topics = ['Science fiction', 'Disability & inclusion', 'Fantasy', 'History', 'Biography',
  'Children', 'Mystery', 'Health', 'Education'];
const featureTiles = [
  { name: 'Listen', icon: Headphones, detail: 'Discover narrated books through LibriVox and archival collections', term: 'audiobooks', source: 'librivox' as const },
  { name: 'Read', icon: BookOpen, detail: 'Find ebooks, editions and public-library records', term: 'classic literature', source: 'open-library' as const },
  { name: 'Explore', icon: LibraryBig, detail: 'Browse books by topic across independent catalogues', term: 'disability and inclusion', source: 'all' as const },
];

function goodreadsLink(book: CatalogueBook): string {
  return `https://www.goodreads.com/search?q=${encodeURIComponent([book.title, ...book.authors.slice(0, 1)].join(' '))}`;
}
function isNativeApp(): boolean {
  const bridge = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return bridge?.isNativePlatform?.() === true;
}
function amazonSearchLink(book: CatalogueBook): string {
  return `https://www.amazon.com.au/s?k=${encodeURIComponent(book.isbn || [book.title, ...book.authors.slice(0, 1)].join(' '))}&i=stripbooks`;
}
function durationLabel(seconds?: number): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours ? `${hours} hr ` : ''}${minutes} min`;
}

export function BookTile({ book, view, myBooks }: { book: CatalogueBook; view: 'grid' | 'list'; myBooks: PersonalGoodreadsEntry[] }) {
  const myRating = ratingForIsbn(myBooks, book.isbn);
  const isRetail = book.provider === 'amazon-creators';
  const textPreview = book.description?.replace(/<[^>]+>/g, '').slice(0, 260);
  return (
    <article className={`ab-book ${view === 'list' ? 'ab-book--list' : ''}`}>
      <div className="ab-book__cover">
        {book.coverUrl ? <img src={book.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
          : <div className="ab-cover-placeholder" aria-hidden="true">{book.format === 'audiobook' ? <Headphones size={38} /> : <BookOpen size={38} />}</div>}
        <span className="ab-book__kind">{isRetail ? 'Retail' : book.format === 'audiobook' ? 'Audio' : book.format === 'ebook' ? 'eBook' : 'Book'}</span>
      </div>
      <div className="ab-book__body">
        <p className="ab-source">{labels[book.provider]}</p>
        <h3 className="ab-book__title">{book.title}</h3>
        <p className="ab-book__author">{book.authors.length ? book.authors.join(', ') : 'Author not provided'}</p>
        <div className="ab-book__facts">
          {book.language && <span>{book.language}</span>}
          {book.durationSeconds ? <span>{durationLabel(book.durationSeconds)}</span> : null}
          {book.chapters?.length ? <span>{book.chapters.length} sections</span> : null}
          {myRating && <span>Your Goodreads rating: {myRating}/5</span>}
        </div>
        {view === 'list' && textPreview && <p className="ab-book__description">{textPreview}</p>}
        <p className="ab-book__rights">{isRetail ? 'External shopping result, not an AccessiBooks audiobook'
          : book.rights?.auStatus === 'cleared' ? 'Australian reuse reviewed'
          : book.rights?.auStatus === 'restricted' ? 'Restricted rights'
          : 'Australian reuse rights not verified'}</p>
        <div className="ab-book__links">
          {book.sourceUrl && <a className="ab-book__primary-link" href={book.sourceUrl} target="_blank" rel="noopener noreferrer">
            {isRetail ? 'View on Amazon' : `View ${book.format === 'audiobook' ? 'recording' : 'book'}`} <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>}
          {!isRetail && !isNativeApp() && <a className="ab-book__subtle-link" href={amazonSearchLink(book)} target="_blank" rel="noopener noreferrer">
            Find on Amazon <span className="sr-only">(opens in a new tab)</span>
          </a>}
          {!isRetail && <a className="ab-book__subtle-link" href={goodreadsLink(book)} target="_blank" rel="noopener noreferrer">
            Goodreads <span className="sr-only">(opens in a new tab)</span>
          </a>}
        </div>
      </div>
    </article>
  );
}

export default function ContentDiscovery() {
  const [sources, setSources] = useState<Source[]>([]);
  const [term, setTerm] = useState('');
  const [source, setSource] = useState<SourceId | 'all'>('all');
  const [format, setFormat] = useState<'all' | 'audiobook' | 'ebook'>('all');
  const [language, setLanguage] = useState('');
  const [indexed, setIndexed] = useState(false);
  const [items, setItems] = useState<CatalogueBook[]>([]);
  const [cursors, setCursors] = useState<Partial<Record<SourceId, string | null>>>({});
  const [indexedNext, setIndexedNext] = useState(false);
  const [errors, setErrors] = useState<SearchResponse['errors']>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Start by searching for a title, author or topic.');
  const [searched, setSearched] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'relevance' | 'title' | 'author'>('relevance');
  const [myBooks, setMyBooks] = useState<PersonalGoodreadsEntry[]>([]);
  const [importStatus, setImportStatus] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const pending = new AbortController();
    fetch('/api/catalogue/sources', { signal: pending.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { sources?: Source[] }) => setSources(data.sources || []))
      .catch(() => { if (!pending.signal.aborted) setMessage('Catalogue source status is unavailable; search may still work.'); });
    return () => { pending.abort(); controller.current?.abort(); };
  }, []);

  // Amazon retail content is deliberately isolated on /bookshop, not blended with library results.
  const shownBooks = useMemo(() => {
    if (sort === 'relevance') return items;
    return [...items].sort((a, b) => sort === 'title'
      ? a.title.localeCompare(b.title) : (a.authors[0] || '').localeCompare(b.authors[0] || ''));
  }, [items, sort]);

  async function runSearch(loadMore = false, override?: { query?: string; provider?: SourceId | 'all' }) {
    const q = (override?.query ?? term).trim();
    const provider = override?.provider ?? source;
    if (!q) { setMessage('Enter a title, author or topic to search.'); return; }
    if (busy) return;
    if (provider === 'amazon-creators') {
      setMessage('For Amazon retail results, open the separate Bookshop view.'); return;
    }
    if (override?.query) setTerm(override.query);
    if (override?.provider) setSource(override.provider);
    controller.current?.abort();
    const aborter = new AbortController();
    controller.current = aborter;
    setBusy(true);
    setMessage('Searching book catalogues…');
    if (!loadMore) { setItems([]); setErrors([]); setSearched(false); }
    const params = new URLSearchParams({ q, limit: '20' });
    if (provider !== 'all') params.set('source', provider);
    if (format !== 'all') params.set('format', format);
    if (language.trim()) params.set('language', language.trim());
    if (indexed) {
      if (loadMore) params.set('offset', String(items.length));
    } else if (loadMore && provider !== 'all' && cursors[provider]) {
      params.set('cursor', cursors[provider]!);
    }
    const endpoint = indexed ? '/api/catalogue/index' : '/api/catalogue/search';
    try {
      const response = await fetch(`${endpoint}?${params}`, { signal: aborter.signal });
      if (!response.ok) throw new Error(response.status === 503 ? 'This provider is not configured or the index is unavailable.' : 'Search could not be completed.');
      const data = await response.json() as SearchResponse;
      const next = loadMore ? [...items, ...data.items] : data.items;
      const unique = [...new Map(next.map(book => [book.key, book])).values()];
      setItems(unique);
      setCursors(data.nextCursors || {});
      setIndexedNext(indexed && data.items.length === 20);
      setErrors(data.errors || []);
      setSearched(true);
      setMessage(`${unique.length} catalogue records displayed${data.errors?.length ? `, with ${data.errors.length} source notices` : ''}.`);
    } catch (error) {
      if (!aborter.signal.aborted) setMessage(error instanceof Error ? error.message : 'Search failed.');
    } finally { if (!aborter.signal.aborted) setBusy(false); }
  }

  async function importGoodreads(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_GOODREADS_EXPORT_BYTES) throw new Error('Select a Goodreads CSV smaller than 3 MB.');
      const books = parseGoodreadsExport(await file.text());
      setMyBooks(books);
      setImportStatus(`Loaded ${books.length} personal Goodreads shelf entries locally. Nothing was uploaded.`);
    } catch (error) { setImportStatus(error instanceof Error ? error.message : 'The Goodreads file could not be read.'); }
  }

  const canLoadMore = searched && (indexed ? indexedNext : source !== 'all' && !!cursors[source]);
  return (
    <main id="main-content" className="ab-discovery">
      <div className="ab-shell">
        <header className="ab-topbar" aria-label="AccessiBooks library discovery">
          <a href="/" className="ab-brand"><span className="ab-brand__icon" aria-hidden="true"><BookOpen size={24} /></span>
            <span>Accessi<span>Books</span></span></a>
          <nav className="ab-topbar__nav" aria-label="Library sections">
            <a href="/">Home</a>
            <span aria-current="page">Discover</span>
            <a href="/library">My Library</a>
            <a href="/audiobook-services">Audiobooks</a>
            <a href="/bookshop">Bookshop</a>
          </nav>
          <div className="ab-topbar__tag"><BookMarked size={16} aria-hidden="true" /> Books for every reader</div>
        </header>

        <section className="ab-hero" aria-labelledby="ab-hero-title">
          <div className="ab-hero__copy">
            <p className="ab-eyebrow">YOUR ACCESSIBLE DIGITAL LIBRARY</p>
            <h1 id="ab-hero-title">Every story deserves<br /><em>an open door.</em></h1>
            <p>Find books, audiobooks and new voices across independent catalogues. Choose how you explore, listen and read.</p>
            <form className="ab-hero__search" onSubmit={e => { e.preventDefault(); void runSearch(); }} role="search">
              <label htmlFor="ab-catalogue-search" className="sr-only">Search books, authors and subjects</label>
              <Search size={22} aria-hidden="true" />
              <input id="ab-catalogue-search" type="search" maxLength={120} required value={term}
                placeholder="Search books, authors, subjects…" onChange={e => setTerm(e.target.value)} />
              <button type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search library'} <ArrowRight size={17} aria-hidden="true" /></button>
            </form>
            <p className="ab-hero__subnote">No membership needed to search · Individual titles may have different access conditions</p>
          </div>
          <div className="ab-hero__art" aria-hidden="true">
            <div className="ab-art-halo" />
            <div className="ab-spine ab-spine--one" /><div className="ab-spine ab-spine--two" />
            <div className="ab-spine ab-spine--three" /><div className="ab-spine ab-spine--four" />
            <div className="ab-art-shelf" />
            <div className="ab-hero__art-label">A library for everyone</div>
          </div>
        </section>

        <section className="ab-topics" aria-labelledby="ab-topics-heading">
          <div className="ab-heading-row"><h2 id="ab-topics-heading">Browse by subject</h2><span>Explore something new</span></div>
          <div className="ab-topic-list">{topics.map(topic => <button type="button" key={topic} onClick={() => void runSearch(false, { query: topic, provider: 'all' })} disabled={busy}>
            {topic} <ArrowRight size={15} aria-hidden="true" />
          </button>)}</div>
        </section>

        <div className="ab-content">
          <aside className="ab-filters" aria-labelledby="ab-filter-title">
            <div className="ab-filter-title"><SlidersHorizontal size={19} aria-hidden="true" /><h2 id="ab-filter-title">Refine discovery</h2></div>
            <div className="ab-control">
              <label htmlFor="ab-source">Catalogue</label>
              <select id="ab-source" value={source} onChange={e => { const chosen = e.target.value as SourceId | 'all'; setSource(chosen); if (chosen === 'amazon-creators') setIndexed(false); }}>
                <option value="all">All connected catalogues</option>
                {sources.filter(s => s.id !== 'amazon-creators').map(s => <option key={s.id} value={s.id} disabled={s.status !== 'configured'}>
                  {s.name}{s.status === 'requires-credentials' ? ' (not connected)' : ''}
                </option>)}
              </select>
            </div>
            <div className="ab-control">
              <label htmlFor="ab-format">Format</label>
              <select id="ab-format" value={format} onChange={e => setFormat(e.target.value as typeof format)}>
                <option value="all">All book formats</option><option value="audiobook">Audiobooks</option>
                <option value="ebook">Ebooks</option>
              </select>
            </div>
            <div className="ab-control">
              <label htmlFor="ab-language">Language</label>
              <input id="ab-language" value={language} maxLength={12} pattern="[A-Za-z-]{2,12}" placeholder="e.g. en"
                onChange={e => setLanguage(e.target.value)} />
            </div>
            <label className="ab-checkbox"><input type="checkbox" checked={indexed} disabled={source === 'amazon-creators'}
              onChange={e => setIndexed(e.target.checked)} /><span>Search my indexed catalogue</span></label>
            <button className="ab-refine-button" type="button" disabled={busy} onClick={() => void runSearch()}>
              <RefreshCcw size={16} aria-hidden="true" /> Apply filters
            </button>

            <div className="ab-filter-divider" />
            <div className="ab-goodreads">
              <BookMarked size={22} aria-hidden="true" />
              <h3>Your Goodreads shelves</h3>
              <p>Import your own Goodreads CSV export to recognise your ratings by ISBN. Goodreads does not provide a new public API.</p>
              <label className="ab-upload" htmlFor="ab-goodreads-file"><Upload size={16} aria-hidden="true" /> Choose Goodreads CSV</label>
              <input id="ab-goodreads-file" type="file" accept=".csv,text/csv" onChange={e => { void importGoodreads(e.target.files?.[0]); e.target.value = ''; }} />
              {importStatus && <p className="ab-upload-status" role="status">{importStatus}</p>}
              {myBooks.length > 0 && <button type="button" className="ab-clear" onClick={() => { setMyBooks([]); setImportStatus('Personal shelves cleared from this page.'); }}>Clear imported shelves</button>}
              <p className="ab-privacy">File stays in your browser memory. Nothing is sent to AccessiBooks.</p>
            </div>
          </aside>

          <section className="ab-results" aria-labelledby="ab-results-title" aria-busy={busy}>
            <div className="ab-results__heading">
              <div><p className="ab-eyebrow">DISCOVER & EXPLORE</p>
                <h2 id="ab-results-title">{searched ? 'Your search results' : 'Explore the collection'}</h2>
                <p className="ab-results__intro">{searched ? `${shownBooks.length} records shown · From independent sources` : 'Browse by a favourite subject or begin with a book title.'}</p>
              </div>
              <div className="ab-display-control">
                <label htmlFor="ab-sort" className="sr-only">Sort visible results</label>
                <select id="ab-sort" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
                  <option value="relevance">Relevance</option><option value="title">Title A–Z</option><option value="author">Author A–Z</option>
                </select>
                <div className="ab-layout-picker" aria-label="Result display">
                  <button type="button" aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 size={18} /></button>
                  <button type="button" aria-label="List view" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={18} /></button>
                </div>
              </div>
            </div>
            <p role="status" aria-live="polite" className="ab-search-status">{message}</p>
            {!!errors?.length && <div className="ab-notice" role="note"><Info size={20} aria-hidden="true" /><span>Some providers are currently unavailable: {errors.map(e => labels[e.provider]).join(', ')}. Other results are still shown.</span></div>}
            {!searched && !busy && <div className="ab-feature-grid">
              {featureTiles.map(t => <button type="button" className="ab-feature" key={t.name}
                onClick={() => void runSearch(false, { query: t.term, provider: t.source })}>
                <span className="ab-feature__icon"><t.icon size={28} aria-hidden="true" /></span>
                <span className="ab-feature__title">{t.name} <ArrowRight size={17} aria-hidden="true" /></span>
                <span className="ab-feature__text">{t.detail}</span>
              </button>)}
            </div>}
            {searched && !shownBooks.length && <div className="ab-empty"><BookOpen size={44} aria-hidden="true" /><h3>No matching books returned</h3><p>Try another subject, a broader phrase, or a different catalogue.</p></div>}
            {shownBooks.length > 0 && <div className={`ab-book-grid ab-book-grid--${layout}`}>
              {shownBooks.map(book => <BookTile key={book.key} book={book} view={layout} myBooks={myBooks} />)}
            </div>}
            {canLoadMore && <button className="ab-load-more" type="button" disabled={busy} onClick={() => void runSearch(true)}>Load more results <ArrowRight size={17} aria-hidden="true" /></button>}
            <div className="ab-disclosure"><Info size={18} aria-hidden="true" /><p>
              <strong>Availability is source-dependent.</strong> Browsing does not imply permission to reproduce or stream books in Australia.
              Amazon results are external retail listings. Their prices and stock are checked on Amazon, not stored here.
              Retail discovery is on a separate Bookshop page. Library records do not contain Amazon API product data.
            </p></div>
          </section>
        </div>
        <footer className="ab-footer"><span>AccessiBooks · Books for every reader</span>
          <span>Inspired by open-library discovery patterns; independently designed for AccessiBooks.</span></footer>
      </div>
    </main>
  );
