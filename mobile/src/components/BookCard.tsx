import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Book } from '@/domain/types';
import { useAaxTheme } from '@/theme/useAaxTheme';

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

export function BookCard({ book, onPress }: BookCardProps) {
  const theme = useAaxTheme();
  const label = `${book.title} by ${book.author}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens book details and available reading formats"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          minHeight: Math.max(104, theme.targetSize),
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {book.coverImage ? (
        <Image
          accessible={false}
          source={{ uri: book.coverImage }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View accessible={false} style={[styles.cover, { backgroundColor: theme.colors.background }]} />
      )}
      <View style={styles.copy}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.scale(18),
            lineHeight: theme.lineHeight(18),
            fontWeight: '700',
            letterSpacing: theme.letterSpacing,
          }}
        >
          {book.title}
        </Text>
        <Text
          style={{
            color: theme.colors.mutedText,
            fontSize: theme.scale(15),
            lineHeight: theme.lineHeight(15),
            letterSpacing: theme.letterSpacing,
          }}
        >
          {book.author}
        </Text>
        <Text
          style={{
            color: theme.colors.mutedText,
            fontSize: theme.scale(13),
            lineHeight: theme.lineHeight(13),
          }}
        >
          {book.source}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  cover: {
    width: 64,
    height: 96,
    borderRadius: 8,
  },
  copy: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
});
