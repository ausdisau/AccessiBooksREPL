import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  DEFAULT_EXPERIENCE_PROFILE,
  ExperienceProvider,
  mergeExperienceProfile,
  useExperience,
} from '@/state/experience';

describe('AAX experience profile', () => {
  it('enforces the no-automatic-persistent-change invariant', () => {
    const result = mergeExperienceProfile(DEFAULT_EXPERIENCE_PROFILE, {
      autonomy: { allowAutomaticChanges: true as never, explainAdaptations: false as never },
    });
    expect(result.autonomy.allowAutomaticChanges).toBe(false);
    expect(result.autonomy.explainAdaptations).toBe(true);
  });

  it('previews without committing and only persists after Keep', async () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ExperienceProvider>{children}</ExperienceProvider>
    );
    const { result } = renderHook(() => useExperience(), { wrapper });

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.preview({ visual: { textScale: 1.5 } });
    });

    expect(result.current.profile.visual.textScale).toBe(1.5);
    expect(result.current.committedProfile.visual.textScale).toBe(1);
    expect(result.current.hasPreview).toBe(true);

    await act(async () => {
      await result.current.keep();
    });

    expect(result.current.committedProfile.visual.textScale).toBe(1.5);
    expect(result.current.hasPreview).toBe(false);
  });
});
