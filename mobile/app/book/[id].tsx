import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Book } from '@/domain/types';
import { getBookCapabilities } from '@/domain/capabilities';
import { accessiBooksApi } from '@/services/api';
import { useSafeAnalytics } from '@/services/analytics';
import { useLibrary } from '@/state/library';
import { AccessibleButton } from '@/components/AccessibleButton';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { useAaxTheme } from '@/theme/useAaxTheme';

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAaxTheme();
  const capture = useSafeAnalytics();
  const library = useLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setBook(await accessiBooksApi.getBook(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this book.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    capture('screen_viewed', { screen: 'book' });
    void load();
  }, [capture, load]);

  if (loading) return <LoadingState label="Loading book" />;
  if (error || !book) return <ErrorState message={error ?? 'Book not found.'} onRetry={() => void load()} />;

  const capabilities = getBookCapabilities(book);
  const saved = library.isSaved(book.id);

  const openExternalText = async () => {
    capture('format_selected', { mode: 'read', delivery: 'external_source' });
    await Linking.openURL(accessiBooksApi.streamUrl(book.id));
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      {book.coverImage ? (
        <Image
          source={{ uri: book.coverImage }}
          accessibilityLabel={`Cover of ${book.title}`}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : null}
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.text, fontSize: theme.scale(30), lineHeight: theme.lineHeight(30), fontWeight: '800', letterSpacing: theme.letterSpacing }}
      >
        {book.title}
      </Text>
      <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(18), lineHeight: theme.lineHeight(18) }}>
        by {book.author}
      </Text>
      {book.narrator ? (
        <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(15), lineHeight: theme.lineHeight(15) }}>
          Narrated by {book.narrator}
        </Text>
      ) : null}
      {book.description ? (
        <Text style={{ color: theme.colors.text, fontSize: theme.scale(16), lineHeight: theme.lineHeight(16), letterSpacing: theme.letterSpacing }}>
          {book.description}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <AccessibleButton
          label={saved ? 'Remove from library' : 'Save to library'}
          variant="secondary"
          onPress={() => {
            if (saved) {
              void library.remove(book.id);
              capture('library_book_removed', { source: book.source });
            } else {
              void library.save(book);
              capture('library_book_saved', { source: book.source });
            }
          }}
        />
      </View>

      <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: theme.scale(22), lineHeight: theme.lineHeight(22), fontWeight: '700' }}>
        Choose a format
      </Text>
      <View style={styles.actions}>
        <AccessibleButton
          label={capabilities.canListen ? 'Listen' : 'Listen — unavailable for this source'}
          disabled={!capabilities.canListen}
          hint="Opens the native audiobook player"
          onPress={() => {
            capture('format_selected', { mode: 'listen', source: book.source });
            router.push({ pathname: '/player/[id]', params: { id: book.id } });
          }}
        />
        <AccessibleButton
          label={capabilities.canOpenExternalText ? 'Read at source' : 'Read — native text not available yet'}
          variant="secondary"
          disabled={!capabilities.canOpenExternalText}
          hint={capabilities.canOpenExternalText ? 'Opens the publisher or public-domain text source' : 'Requires a canonical text endpoint'}
          onPress={() => void openExternalText()}
        />
        <AccessibleButton
          label="Read Along — transcript not available yet"
          variant="secondary"
          disabled={!capabilities.canReadAlong}
          hint="Read Along will activate when synchronized text or transcript data is available"
          onPress={() => undefined}
        />
        <AccessibleButton
          label="Learn about this book"
          variant="secondary"
          onPress={() => {
            capture('learn_opened', { context_type: 'overview', source: book.source });
            router.push({ pathname: '/learn/[id]', params: { id: book.id } });
          }}
        />
      </View>

      <View style={[styles.note, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text, fontSize: theme.scale(15), lineHeight: theme.lineHeight(15) }}>
          Native Read and Read Along are intentionally not simulated. The current AccessiBooks API exposes catalogue and audio routes but not canonical book text or synchronized transcript data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 14, paddingBottom: 48 },
  cover: { width: 180, height: 270, alignSelf: 'center', borderRadius: 12 },
  actions: { gap: 10 },
  note: { borderWidth: 1, borderRadius: 14, padding: 14 },
});
