import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ExperienceProfile, ExperienceProfilePatch } from '@/domain/types';

const STORAGE_KEY = 'accessibooks.experience-profile.v1';

export const DEFAULT_EXPERIENCE_PROFILE: ExperienceProfile = {
  schemaVersion: 1,
  visual: {
    textScale: 1,
    contrast: 'system',
    theme: 'system',
    motion: 'system',
    density: 'standard',
    typography: 'standard',
  },
  interaction: {
    preferredInput: 'system',
    targetSize: 'standard',
    confirmations: 'standard',
  },
  reading: {
    mode: 'listen',
    highlightMode: 'sentence',
    playbackRate: 1,
  },
  didactic: {
    explanationDepth: 1,
    vocabularySupport: true,
    historicalContext: false,
    authorContext: false,
    pronunciationSupport: false,
    knowledgeChecks: false,
  },
  autonomy: {
    allowSuggestions: true,
    allowAutomaticChanges: false,
    explainAdaptations: true,
  },
};

export function mergeExperienceProfile(
  base: ExperienceProfile,
  patch: ExperienceProfilePatch,
): ExperienceProfile {
  return {
    ...base,
    ...patch,
    schemaVersion: 1,
    visual: { ...base.visual, ...patch.visual },
    interaction: { ...base.interaction, ...patch.interaction },
    reading: { ...base.reading, ...patch.reading },
    didactic: { ...base.didactic, ...patch.didactic },
    autonomy: {
      ...base.autonomy,
      ...patch.autonomy,
      allowAutomaticChanges: false,
      explainAdaptations: true,
    },
  };
}

export function migrateExperienceProfile(raw: unknown): ExperienceProfile {
  if (!raw || typeof raw !== 'object') return DEFAULT_EXPERIENCE_PROFILE;
  const candidate = raw as Partial<ExperienceProfile>;
  return mergeExperienceProfile(DEFAULT_EXPERIENCE_PROFILE, candidate as ExperienceProfilePatch);
}

interface ExperienceContextValue {
  profile: ExperienceProfile;
  committedProfile: ExperienceProfile;
  hydrated: boolean;
  hasPreview: boolean;
  canUndo: boolean;
  preview: (patch: ExperienceProfilePatch) => void;
  discardPreview: () => void;
  keep: () => Promise<void>;
  undo: () => Promise<void>;
  reset: () => Promise<void>;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: React.PropsWithChildren) {
  const [committedProfile, setCommittedProfile] = useState(DEFAULT_EXPERIENCE_PROFILE);
  const [previewProfile, setPreviewProfile] = useState<ExperienceProfile | null>(null);
  const [previousProfile, setPreviousProfile] = useState<ExperienceProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          setCommittedProfile(migrateExperienceProfile(JSON.parse(stored)));
        } catch {
          setCommittedProfile(DEFAULT_EXPERIENCE_PROFILE);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const preview = useCallback((patch: ExperienceProfilePatch) => {
    setPreviewProfile((current) =>
      mergeExperienceProfile(current ?? committedProfile, patch),
    );
  }, [committedProfile]);

  const discardPreview = useCallback(() => setPreviewProfile(null), []);

  const persist = useCallback(async (next: ExperienceProfile) => {
    setCommittedProfile(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const keep = useCallback(async () => {
    if (!previewProfile) return;
    setPreviousProfile(committedProfile);
    setPreviewProfile(null);
    await persist(previewProfile);
  }, [committedProfile, persist, previewProfile]);

  const undo = useCallback(async () => {
    if (!previousProfile) return;
    const current = committedProfile;
    setPreviousProfile(current);
    setPreviewProfile(null);
    await persist(previousProfile);
  }, [committedProfile, persist, previousProfile]);

  const reset = useCallback(async () => {
    setPreviousProfile(committedProfile);
    setPreviewProfile(null);
    await persist(DEFAULT_EXPERIENCE_PROFILE);
  }, [committedProfile, persist]);

  const value = useMemo<ExperienceContextValue>(() => ({
    profile: previewProfile ?? committedProfile,
    committedProfile,
    hydrated,
    hasPreview: previewProfile !== null,
    canUndo: previousProfile !== null,
    preview,
    discardPreview,
    keep,
    undo,
    reset,
  }), [
    committedProfile,
    discardPreview,
    hydrated,
    keep,
    preview,
    previewProfile,
    previousProfile,
    reset,
    undo,
  ]);

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceContextValue {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error('useExperience must be used inside ExperienceProvider');
  return value;
}
