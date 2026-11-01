import { useEffect, useRef, useState } from 'react';
import { BookOpen, Search, ShoppingBag, ExternalLink, Info, ArrowRight } from 'lucide-react';
import { BookTile } from './content-discovery';
import './content-discovery.css';

interface AmazonBook {
  key: string; provider: 'amazon-creators'; providerId: string; title: string;
  authors: string[]; description?: string; language?: string; format: string; subjects: string[];
  sourceUrl?: string; coverUrl?: string; isbn?: string; chapters: [];
  assets: []; rights: { auStatus: 'review-required'; sourceStatement: string };
}

function runningInNativeApp(): boolean {
  const bridge = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return bridge?.isNativePlatform?.() === true;
}

export default function AmazonBookshop() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<AmazonBook[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState('Check Amazon Books availability before searching.');
  const [busy, setBusy] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetch('/api/catalogue/sources', { signal: c.signal })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { sources?: Array<{ id: string; status: string }> }) => {
        const native = runningInNativeApp();
        const active = data.sources?.some(s => s.id === 'amazon-creators' && s.status === 'configured') || false;
        setConfigured(active && !native);
        setStatus(native ? 'The Amazon bookshop is unavailable in the native application pending separate Amazon mobile approval.'
          : active ? 'Amazon Books is connected. Search available Australian retail listings.'
          : 'Amazon Creators API is not active. An approved Associates account, credentials and a policy review are required.');
      })
      .catch(() => { if (!c.signal.aborted) setStatus('Could not verify Amazon Creators API configuration.'); });
    return () => { c.abort(); controller.current?.abort(); };
  }, []);

  async function search(loadMore = false) {
    if (!configured || !query.trim() || busy) return;
    controller.current?.abort();
    const pending = new AbortController();
    controller.current = pending;
    setBusy(true);
    setStatus('Searching Amazon Books…');
    if (!loadMore) { setBooks([]); setHasSearched(false); }
    const params = new URLSearchParams({ q: query.trim(), source: 'amazon-creators', limit: '10' });
    if (loadMore && nextCursor) params.set('cursor', nextCursor);
    try {
      const response = await fetch(`/api/catalogue/search?${params}`, { signal: pending.signal });
      if (!response.ok) throw new Error('Amazon Books is currently unavailable.');
      const result = await response.json() as { items: AmazonBook[]; nextCursors?: { 'amazon-creators'?: string | null }; errors?: Array<unknown> };
      const unique = [...new Map((loadMore ? [...books, ...result.items] : result.items)
        .filter(item => item.provider === 'amazon-creators').map(item => [item.key, item])).values()];
      setBooks(unique);
      setNextCursor(result.nextCursors?.['amazon-creators'] ?? null);
      setHasSearched(true);
      setStatus(result.errors?.length ? 'Amazon search is temporarily unavailable.' : `${unique.length} Amazon Books listings shown.`);
    } catch (error) {
      if (!pending.signal.aborted) setStatus(error instanceof Error ? error.message : 'Search could not be completed.');
    } finally { if (!pending.signal.aborted) setBusy(false); }
  }

  return (
    <main id="main-content" className="ab-discovery ab-shop">
      <div className="ab-shell">
        <header className="ab-topbar">
          <a href="/" className="ab-brand"><span className="ab-brand__icon" aria-hidden="true"><BookOpen size={24} /></span><span>Accessi<span>Books</span></span></a>
          <nav className="ab-topbar__nav" aria-label="Site navigation"><a href="/content-discovery">Discover library</a><span aria-current="page">Bookshop</span><a href="/library">My Library</a></nav>
          <div className="ab-topbar__tag"><ShoppingBag size={15} aria-hidden="true" /> Retail discovery</div>
        </header>
        <section className="ab-shop-header">
          <p className="ab-eyebrow">ACCESSIBOOKS BOOKSHOP · AUSTRALIA</p>
          <h1>Find a book to buy</h1>
          <p>Search Amazon Australia using the authorised Creators API when enabled. This is a retail discovery experience, separate from the free AccessiBooks catalogue.</p>
          <form className="ab-hero__search" onSubmit={e => { e.preventDefault(); void search(); }} role="search">
            <label htmlFor="ab-shop-query" className="sr-only">Search Amazon Australia books</label>
            <Search size={20} aria-hidden="true" />
            <input id="ab-shop-query" type="search" maxLength={120} required value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books on Amazon Australia…" />
            <button type="submit" disabled={busy || !configured}>{busy ? 'Searching…' : 'Search books'} <ArrowRight size={16} aria-hidden="true" /></button>
          </form>
          <p className="ab-shop-status" aria-live="polite" role="status">{status}</p>
        </section>
        <div className="ab-shop-disclosure" role="note"><Info size={20} aria-hidden="true" />
          <p>Amazon product content is shown only in this Amazon-focused bookshop and links only to Amazon product pages. Prices and availability are confirmed on Amazon. Purchases are not processed by AccessiBooks. As an Amazon Associate, AccessiBooks may earn from qualifying purchases when its approved affiliate integration is enabled.</p>
        </div>
        <section className="ab-shop-content" aria-label="Amazon Bookshop results" aria-busy={busy}>
          <div className="ab-results__heading"><div><p className="ab-eyebrow">RETAIL BOOK DISCOVERY</p><h2>{hasSearched ? 'Amazon Books results' : 'Browse the Australian bookshop'}</h2></div>
            {configured && <span className="ab-connected"><span aria-hidden="true">●</span> API configured</span>}
          </div>
          {!configured && <div className="ab-empty"><ShoppingBag size={43} aria-hidden="true" /><h3>Amazon integration is inactive</h3>
            <p>A site administrator must review the Associates policies and configure the Creators API before enabling this section.</p>
            <a href="https://affiliate-program.amazon.com.au/creatorsapi/docs/en-us/introduction" target="_blank" rel="noopener noreferrer">Read Amazon Creators API requirements <ExternalLink size={14} aria-hidden="true" /></a>
          </div>}
          {hasSearched && books.length === 0 && <div className="ab-empty"><BookOpen size={42} aria-hidden="true" /><h3>No retail listings returned</h3><p>Try a different title or author.</p></div>}
          {books.length > 0 && <div className="ab-book-grid ab-book-grid--shop">{books.map(book =>
            <BookTile key={book.key} book={book} view="grid" myBooks={[]} />)}</div>}
          {!!nextCursor && <button type="button" className="ab-load-more" disabled={busy} onClick={() => void search(true)}>Load more Amazon results <ArrowRight size={16} aria-hidden="true" /></button>}
        </section>
        <footer className="ab-footer"><span>AccessiBooks Bookshop</span><span>Separate retail discovery · Australian marketplace</span></footer>
      </div>
    </main>
  );
}
