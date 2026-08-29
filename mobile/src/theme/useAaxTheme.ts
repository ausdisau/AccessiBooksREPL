import { useColorScheme } from 'react-native';
import { useExperience } from '@/state/experience';

export function useAaxTheme() {
  const { profile } = useExperience();
  const systemScheme = useColorScheme();
  const dark = profile.visual.theme === 'dark' ||
    (profile.visual.theme === 'system' && systemScheme === 'dark') ||
    profile.visual.contrast === 'enhanced';
  const sepia = profile.visual.theme === 'sepia' && profile.visual.contrast !== 'enhanced';

  const colors = dark
    ? {
        background: '#000000',
        surface: '#121212',
        text: '#FFFFFF',
        mutedText: '#D1D5DB',
        border: '#FFFFFF',
        primary: '#8AB4F8',
        primaryText: '#000000',
        danger: '#FFB4AB',
      }
    : sepia
      ? {
          background: '#F4ECD8',
          surface: '#FFF8E7',
          text: '#2E261B',
          mutedText: '#665B4B',
          border: '#7A6F5B',
          primary: '#2255A4',
          primaryText: '#FFFFFF',
          danger: '#A92525',
        }
      : {
          background: '#FFFFFF',
          surface: '#F7F7F8',
          text: '#111827',
          mutedText: '#4B5563',
          border: '#6B7280',
          primary: '#155EEF',
          primaryText: '#FFFFFF',
          danger: '#B42318',
        };

  const scale = (size: number) => Math.round(size * profile.visual.textScale);
  const lineHeight = (size: number) =>
    Math.round(scale(size) * (profile.visual.typography === 'reading-support' ? 1.6 : 1.35));

  return {
    profile,
    colors,
    scale,
    lineHeight,
    targetSize: profile.interaction.targetSize === 'enhanced' ? 56 : 48,
    letterSpacing: profile.visual.typography === 'reading-support' ? 0.35 : 0,
  };
}
