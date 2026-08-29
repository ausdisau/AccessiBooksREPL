import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookCard } from '@/components/BookCard';
import { useLibrary } from '@/state/library';
import { useSafeAnalytics } from '@/services/analytics';
import { useAaxTheme } from '@/theme/useAaxTheme';

export default function LibraryScreen() {
  const theme = useAaxTheme();
  const router = useRouter();
  const { books } = useLibrary();
  const capture = useSafeAnalytics();

  useEffect(() => {
    capture('screen_viewed', { screen: 'library' });
  }, [capture]);

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      data={books}
      keyExtractor={(book) => book.id}
      ListHeaderComponent={
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
            Your library
          </Text>
          <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(16), lineHeight: theme.lineHeight(16) }}>
            Saved on this device. Reading history is not sent to analytics.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={{ color: theme.colors.text, fontSize: theme.scale(17), lineHeight: theme.lineHeight(17), textAlign: 'center', padding: 30 }}>
          Your library is empty. Open a book from Discover and choose Save to library.
        </Text>
      }
      renderItem={({ item }) => (
        <BookCard
          book={item}
          onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 8, marginBottom: 20 },
});
