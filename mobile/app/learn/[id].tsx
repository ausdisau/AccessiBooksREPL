import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Book } from '@/domain/types';
import { accessiBooksApi } from '@/services/api';
import { useSafeAnalytics } from '@/services/analytics';
import { AccessibleButton } from '@/components/AccessibleButton';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { useAaxTheme } from '@/theme/useAaxTheme';

export default function LearnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAaxTheme();
  const capture = useSafeAnalytics();
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
      setError(cause instanceof Error ? cause.message : 'Could not load learning context.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    capture('screen_viewed', { screen: 'learn' });
    void load();
  }, [capture, load]);

  if (loading) return <LoadingState label="Loading learning context" />;
  if (error || !book) return <ErrorState message={error ?? 'Learning context unavailable.'} onRetry={() => void load()} />;

  const disabledHint = 'Requires the provenance-aware AccessiBooks Learn service, which is not connected in this mobile foundation yet.';

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.text, fontSize: theme.scale(28), lineHeight: theme.lineHeight(28), fontWeight: '800' }}
      >
        Learn with context
      </Text>
      <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(16), lineHeight: theme.lineHeight(16) }}>
        Source metadata and generated assistance are kept separate. Generated factual context will only appear when provenance can be shown.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: theme.scale(20), fontWeight: '700' }}>
          Catalogue metadata
        </Text>
        <Metadata label="Author" value={book.author} />
        <Metadata label="Published" value={book.publishedYear ? String(book.publishedYear) : 'Not provided'} />
        <Metadata label="Genre" value={book.genre || 'Not provided'} />
        <Metadata label="Language" value={book.language || 'Not provided'} />
        <Metadata label="Catalogue source" value={book.source} />
      </View>

      <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: theme.scale(21), lineHeight: theme.lineHeight(21), fontWeight: '700' }}>
        Learning tools
      </Text>
      <View style={styles.actions}>
        <AccessibleButton label="Define words — service not connected" variant="secondary" disabled hint={disabledHint} onPress={() => undefined} />
        <AccessibleButton label="Historical context — service not connected" variant="secondary" disabled hint={disabledHint} onPress={() => undefined} />
        <AccessibleButton label="Author context — service not connected" variant="secondary" disabled hint={disabledHint} onPress={() => undefined} />
        <AccessibleButton label="Deep dive — service not connected" variant="secondary" disabled hint={disabledHint} onPress={() => undefined} />
      </View>

      <View accessibilityRole="summary" style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text, fontSize: theme.scale(15), lineHeight: theme.lineHeight(15) }}>
          Provenance status: the information above comes only from the existing AccessiBooks catalogue record. No generated historical, biographical, or literary claims are being presented as source material.
        </Text>
      </View>
    </ScrollView>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  const theme = useAaxTheme();
  return (
    <Text style={{ color: theme.colors.text, fontSize: theme.scale(16), lineHeight: theme.lineHeight(16) }}>
      <Text style={{ fontWeight: '700' }}>{label}: </Text>{value}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 16, paddingBottom: 48 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 9 },
  actions: { gap: 10 },
});
