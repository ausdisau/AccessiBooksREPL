const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const lib = require(path.join(process.env.CATALOGUE_BUILD, 'goodreads-export.js'));

test('Goodreads CSV import supports quoted titles, embedded newlines and user-only ratings', () => {
  const text = '\uFEFFBook Id,Title,Author,ISBN,ISBN13,My Rating,Average Rating,Exclusive Shelf\r\n' +
    '14,"The Work, Vol. One",Jane Austen,"=\"0123456789\"",9780123456789,5,4.9,read\r\n' +
    '15,"Second Book\nWith Subtitle",Alex Read,,9781234567890,0,4.5,to-read\r\n';
  const result = lib.parseGoodreadsExport(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'The Work, Vol. One');
  assert.equal(result[0].myRating, 5);
  assert.equal(result[1].title, 'Second Book\nWith Subtitle');
  assert.equal(result[1].myRating, null);
  assert.equal(result[0].isbn, '9780123456789');
  assert.equal(lib.ratingForIsbn(result, '9780123456789'), 5);
  assert.equal(lib.ratingForIsbn(result, '9999999999'), null);
  assert.equal(result[0].averageRating, undefined, 'community data must not be copied');
});

test('Goodreads CSV rejects unrecognised formats and unsafe oversized exports', () => {
  assert.throws(() => lib.parseGoodreadsExport('Title,Publisher\nExample,Acme'), /Not a recognised/);
  assert.throws(() => lib.parseGoodreadsExport('x'.repeat(lib.MAX_GOODREADS_EXPORT_BYTES + 1)), /smaller than/);
  assert.throws(() => lib.parseGoodreadsExport('Title,Author,My Rating\n"Bad,A,3'), /unclosed quoted/);
  assert.equal(lib.normaliseIsbn('=(this is not an isbn)'), '');
});
