import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AnalyticsRootProvider, useSafeAnalytics } from '@/services/analytics';
import { ExperienceProvider } from '@/state/experience';
import { LibraryProvider } from '@/state/library';
import { useAaxTheme } from '@/theme/useAaxTheme';

function AppNavigator() {
  const theme = useAaxTheme();
  const capture = useSafeAnalytics();

  useEffect(() => {
    capture('app_opened', { platform_family: 'mobile' });
  }, [capture]);

  return (
    <>
      <StatusBar style={theme.colors.background === '#000000' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="book/[id]" options={{ title: 'Book' }} />
        <Stack.Screen name="player/[id]" options={{ title: 'Listen' }} />
        <Stack.Screen name="learn/[id]" options={{ title: 'Learn' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AnalyticsRootProvider>
      <ExperienceProvider>
        <LibraryProvider>
          <AppNavigator />
        </LibraryProvider>
      </ExperienceProvider>
    </AnalyticsRootProvider>
  );
}
