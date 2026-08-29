import React from 'react';
import { Tabs } from 'expo-router';
import { useAaxTheme } from '@/theme/useAaxTheme';

export default function TabsLayout() {
  const theme = useAaxTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          minHeight: theme.targetSize + 12,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarLabelStyle: {
          fontSize: theme.scale(13),
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarAccessibilityLabel: 'Discover books',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Saved library',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Experience',
          tabBarAccessibilityLabel: 'Adaptive experience settings',
        }}
      />
    </Tabs>
  );
}
