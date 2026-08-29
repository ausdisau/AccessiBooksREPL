import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CONSENT_KEY = 'accessibooks.analytics.enabled.v1';

export type AnalyticsEvent =
  | 'app_opened'
  | 'screen_viewed'
  | 'search_submitted'
  | 'book_opened'
  | 'format_selected'
  | 'playback_started'
  | 'playback_paused'
  | 'experience_previewed'
  | 'experience_kept'
  | 'experience_undone'
  | 'experience_reset'
  | 'library_book_saved'
  | 'library_book_removed'
  | 'learn_opened';

type AnalyticsPrimitive = string | number | boolean | null;
export type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

const FORBIDDEN_PROPERTY_FRAGMENTS = [
  'query',
  'title',
  'author',
  'narrator',
  'passage',
  'transcript',
  'note',
  'book_id',
  'bookid',
  'profile',
  'accessibility',
  'preference',
  'email',
  'name',
];

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties = {},
): AnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      return !FORBIDDEN_PROPERTY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
    }),
  );
}

interface AnalyticsConsentValue {
  enabled: boolean;
  hydrated: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
}

const AnalyticsConsentContext = createContext<AnalyticsConsentValue | null>(null);

export function AnalyticsRootProvider({ children }: React.PropsWithChildren) {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY)
      .then((stored) => setEnabledState(stored === 'true'))
      .finally(() => setHydrated(true));
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    setEnabledState(next);
    await AsyncStorage.setItem(CONSENT_KEY, String(next));
  }, []);

  const consentValue = useMemo(
    () => ({ enabled, hydrated, setEnabled }),
    [enabled, hydrated, setEnabled],
  );

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() || 'disabled';
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

  return (
    <AnalyticsConsentContext.Provider value={consentValue}>
      <PostHogProvider
        apiKey={apiKey}
        options={{
          host,
          disabled: !enabled || apiKey === 'disabled',
          enableSessionReplay: false,
        }}
      >
        {children}
      </PostHogProvider>
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentValue {
  const value = useContext(AnalyticsConsentContext);
  if (!value) throw new Error('useAnalyticsConsent must be used inside AnalyticsRootProvider');
  return value;
}

export function useSafeAnalytics() {
  const posthog = usePostHog();
  const { enabled } = useAnalyticsConsent();

  return useCallback(
    (event: AnalyticsEvent, properties: AnalyticsProperties = {}) => {
      if (!enabled) return;
      posthog.capture(event, sanitizeAnalyticsProperties(properties));
    },
    [enabled, posthog],
  );
}
