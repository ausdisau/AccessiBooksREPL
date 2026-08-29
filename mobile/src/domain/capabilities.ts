import type { Book, BookCapabilities } from './types';

const AUDIO_SOURCES = new Set(['local', 'librivox', 's3', 'gcs']);
const EXTERNAL_TEXT_SOURCES = new Set(['gutenberg', 'google-books']);

export function getBookCapabilities(book: Book): BookCapabilities {
  return {
    canListen: AUDIO_SOURCES.has(book.source),
    canOpenExternalText: EXTERNAL_TEXT_SOURCES.has(book.source),
    // The current server does not expose a canonical text/transcript endpoint yet.
    canReadNatively: false,
    canReadAlong: false,
    // The mobile Learn surface exists, while factual generated context remains disabled
    // until a provenance-aware service endpoint is connected.
    canLearn: true,
  };
}
