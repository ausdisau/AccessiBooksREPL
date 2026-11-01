/** Goodreads discontinued its public API. This parser only handles CSV a user exports and selects locally.
 *  Nothing is uploaded or persisted. It deliberately ignores community review/rating fields. */
export interface PersonalGoodreadsEntry {
  title: string;
  author: string;
  isbn: string;
  shelf: string;
  myRating: number | null;
}
export const MAX_GOODREADS_EXPORT_BYTES = 3_000_000;

function csvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', insideQuotes = false;
  const limit = Math.min(source.length, MAX_GOODREADS_EXPORT_BYTES + 1);
  for (let i = 0; i < limit; i++) {
    const c = source[i];
    if (c === '"') {
      if (insideQuotes && source[i + 1] === '"') { field += '"'; i++; }
      else if (insideQuotes || !field) insideQuotes = !insideQuotes;
      else field += c;
    } else if ((c === '\r' || c === '\n') && !insideQuotes) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      if (rows.length > 25000) throw new Error('The CSV contains too many rows for local import.');
    } else if (c === ',' && !insideQuotes) {
      row.push(field); field = '';
    } else field += c;
  }
  if (insideQuotes) throw new Error('The CSV has an unclosed quoted field.');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function normaliseIsbn(input: string): string {
  // Goodreads CSV often exports ISBN as ="0123456789" to preserve leading zeroes.
  const value = input.replace(/^\s*=?["']?/, '').replace(/["'\s-]/g, '');
  return /^(?:[0-9]{9}[0-9Xx]|[0-9]{13})$/.test(value) ? value.toUpperCase() : '';
}

export function parseGoodreadsExport(source: string): PersonalGoodreadsEntry[] {
  if (new TextEncoder().encode(source).byteLength > MAX_GOODREADS_EXPORT_BYTES) {
    throw new Error('Please select a Goodreads CSV smaller than 3 MB.');
  }
  const rows = csvRows(source.replace(/^\uFEFF/, ''));
  if (!rows.length) throw new Error('The file is empty.');
  const headings = rows[0].map(v => v.trim().toLowerCase());
  const index = (label: string) => headings.indexOf(label.toLowerCase());
  if (index('Title') < 0 || index('Author') < 0 || index('My Rating') < 0) {
    throw new Error('Not a recognised Goodreads export. Expected Title, Author and My Rating columns.');
  }
  const get = (row: string[], label: string) => {
    const idx = index(label);
    return idx < 0 ? '' : (row[idx] || '').trim();
  };
  return rows.slice(1).map(row => {
    const ratingRaw = get(row, 'My Rating');
    const rating = /^\d$/.test(ratingRaw) ? Number(ratingRaw) : 0;
    return {
      title: get(row, 'Title').slice(0, 300),
      author: get(row, 'Author').slice(0, 200),
      isbn: normaliseIsbn(get(row, 'ISBN13')) || normaliseIsbn(get(row, 'ISBN')),
      shelf: get(row, 'Exclusive Shelf').slice(0, 100),
      myRating: rating >= 1 && rating <= 5 ? rating : null,
    };
  }).filter(book => book.title);
}

export function ratingForIsbn(books: PersonalGoodreadsEntry[], isbn?: string): number | null {
  const clean = normaliseIsbn(isbn || '');
  if (!clean) return null;
  return books.find(v => v.isbn === clean)?.myRating ?? null;
}
