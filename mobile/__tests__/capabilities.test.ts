import { getBookCapabilities } from '@/domain/capabilities';
import type { Book } from '@/domain/types';

function book(source: string): Book {
  return {
    id: '1',
    title: 'Example',
    author: 'Author',
    duration: 120,
    audioUrl: 'https://example.invalid/media',
    source,
  };
}

describe('book capabilities', () => {
  it('enables native listening for supported audio sources', () => {
    expect(getBookCapabilities(book('librivox')).canListen).toBe(true);
    expect(getBookCapabilities(book('gutenberg')).canListen).toBe(false);
  });

  it('does not pretend native text or read-along exists before backend support', () => {
    const capabilities = getBookCapabilities(book('gutenberg'));
    expect(capabilities.canOpenExternalText).toBe(true);
    expect(capabilities.canReadNatively).toBe(false);
    expect(capabilities.canReadAlong).toBe(false);
  });
});
