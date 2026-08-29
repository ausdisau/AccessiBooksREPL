import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AccessibleButton } from './AccessibleButton';
import { useAaxTheme } from '@/theme/useAaxTheme';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const theme = useAaxTheme();
  return (
    <View accessibilityLiveRegion="polite" style={styles.center}>
      <ActivityIndicator accessibilityLabel={label} size="large" />
      <Text style={{ color: theme.colors.text, fontSize: theme.scale(16), marginTop: 12 }}>
        {label}
      </Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useAaxTheme();
  return (
    <View accessibilityLiveRegion="assertive" style={styles.center}>
      <Text
        accessibilityRole="alert"
        style={{ color: theme.colors.danger, fontSize: theme.scale(17), lineHeight: theme.lineHeight(17), textAlign: 'center' }}
      >
        {message}
      </Text>
      {onRetry ? <AccessibleButton label="Try again" onPress={onRetry} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
