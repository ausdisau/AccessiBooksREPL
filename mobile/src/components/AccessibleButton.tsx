import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useAaxTheme } from '@/theme/useAaxTheme';

interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  hint?: string;
  disabled?: boolean;
  selected?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function AccessibleButton({
  label,
  onPress,
  hint,
  disabled = false,
  selected,
  variant = 'primary',
  style,
}: AccessibleButtonProps) {
  const theme = useAaxTheme();
  const backgroundColor = variant === 'primary'
    ? theme.colors.primary
    : variant === 'danger'
      ? theme.colors.danger
      : theme.colors.surface;
  const textColor = variant === 'primary'
    ? theme.colors.primaryText
    : variant === 'danger'
      ? '#FFFFFF'
      : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: theme.targetSize,
          backgroundColor,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: variant === 'secondary' || selected ? 2 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: textColor,
          fontSize: theme.scale(16),
          lineHeight: theme.lineHeight(16),
          fontWeight: '700',
          letterSpacing: theme.letterSpacing,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 48,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
