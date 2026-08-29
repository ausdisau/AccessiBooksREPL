import { sanitizeAnalyticsProperties } from '@/services/analytics';

describe('privacy-safe analytics', () => {
  it('keeps coarse product properties', () => {
    expect(sanitizeAnalyticsProperties({ screen: 'discover', result_count: 4, source: 'librivox' })).toEqual({
      screen: 'discover',
      result_count: 4,
      source: 'librivox',
    });
  });

  it('removes reading identity, content, and accessibility data', () => {
    expect(sanitizeAnalyticsProperties({
      book_id: 'secret-book',
      title: 'A title',
      search_query: 'private search',
      passage_text: 'private passage',
      accessibility_preference: 'large text',
      source: 'librivox',
    })).toEqual({ source: 'librivox' });
  });
});
