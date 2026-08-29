import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Book } from '@/domain/types';
import { accessiBooksApi } from '@/services/api';
import { useSafeAnalytics } from '@/services/analytics';
import { BookCard } from '@/components/BookCard';
import { AccessibleButton } from '@/components/AccessibleButton';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { useAaxTheme } from '@/theme/useAaxTheme';

export default function DiscoverScreen() {
  const theme = useAaxTheme();
  const router = useRouter();
  const capture = useSafeAnalytics();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search?: string, trackSearch = false) => {
    setLoading(true);
    setError(null);
    try {
      const normalized = search?.trim() ?? '';
      const result = normalized
        ? await accessiBooksApi.searchBooks(normalized)
        : await accessiBooksApi.listBooks();
      setBooks(result);
      if (trackSearch) capture('search_submitted', { result_count: result.length });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load books.');
    } finally {
      setLoading(false);
    }
  }, [capture]);

  useEffect(() => {
    capture('screen_viewed', { screen: 'discover' });
    void load();
  }, [capture, load]);

  const submit = () => {
    Keyboard.dismiss();
    void load(query, true);
  };

  const header = (
    <View style={styles.header}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.scale(28),
          lineHeight: theme.lineHeight(28),
          fontWeight: '800',
          letterSpacing: theme.letterSpacing,
        }}
      >
        Find your next book
      </Text>
      <Text
        style={{
          color: theme.colors.mutedText,
          fontSize: theme.scale(16),
          lineHeight: theme.lineHeight(16),
          letterSpacing: theme.letterSpacing,
        }}
      >
        Search the AccessiBooks catalogue, then choose the format that works for you.
      </Text>
      <TextInput
        accessibilityLabel="Search books"
        accessibilityHint="Enter a title, author, or keyword"
        placeholder="Title, author, or keyword"
        placeholderTextColor={theme.colors.mutedText}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submit}
        returnKeyType="search"
        style={[
          styles.input,
          {
            minHeight: theme.targetSize,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            fontSize: theme.scale(16),
          },
        ]}
      />
      <AccessibleButton label="Search" onPress={submit} hint="Searches the catalogue" />
      {!loading && !error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.colors.mutedText, fontSize: theme.scale(14) }}
        >
          {books.length} {books.length === 1 ? 'result' : 'results'}
        </Text>
      ) : null}
    </View>
  );

  if (loading && books.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        {header}
        <LoadingState label="Loading catalogue" />
      </View>
    );
  }

  if (error && books.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        {header}
        <ErrorState message={error} onRetry={() => void load(query)} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      data={books}
      keyExtractor={(book) => book.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.colors.text, fontSize: theme.scale(17), textAlign: 'center', padding: 24 }}
        >
          No books matched this search.
        </Text>
      }
      renderItem={({ item }) => (
        <BookCard
          book={item}
          onPress={() => {
            capture('book_opened', { source: item.source });
            router.push({ pathname: '/book/[id]', params: { id: item.id } });
          }}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 12, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
