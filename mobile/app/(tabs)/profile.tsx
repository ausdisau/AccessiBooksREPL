import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { AccessibleButton } from '@/components/AccessibleButton';
import { useAnalyticsConsent, useSafeAnalytics } from '@/services/analytics';
import { useExperience } from '@/state/experience';
import { useAaxTheme } from '@/theme/useAaxTheme';
import type { ExperienceProfilePatch } from '@/domain/types';

export default function ExperienceScreen() {
  const theme = useAaxTheme();
  const experience = useExperience();
  const analyticsConsent = useAnalyticsConsent();
  const capture = useSafeAnalytics();

  useEffect(() => {
    capture('screen_viewed', { screen: 'experience' });
  }, [capture]);

  const preview = (section: string, patch: ExperienceProfilePatch) => {
    experience.preview(patch);
    capture('experience_previewed', { section });
  };

  const keep = async () => {
    await experience.keep();
    capture('experience_kept', { action: 'explicit_keep' });
  };

  const undo = async () => {
    await experience.undo();
    capture('experience_undone', { action: 'explicit_undo' });
  };

  const reset = async () => {
    await experience.reset();
    capture('experience_reset', { action: 'explicit_reset' });
  };

  const rowText = {
    color: theme.colors.text,
    fontSize: theme.scale(16),
    lineHeight: theme.lineHeight(16),
    letterSpacing: theme.letterSpacing,
    flex: 1,
  } as const;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
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
        Adaptive experience
      </Text>
      <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(16), lineHeight: theme.lineHeight(16) }}>
        Changes are previewed first. Nothing becomes a saved accessibility preference until you choose Keep preview.
      </Text>

      <Section title="Text size">
        <View style={styles.buttonRow}>
          {[1, 1.25, 1.5].map((scale) => (
            <AccessibleButton
              key={scale}
              label={`${Math.round(scale * 100)}%`}
              variant="secondary"
              selected={theme.profile.visual.textScale === scale}
              onPress={() => preview('visual', { visual: { textScale: scale } })}
              style={styles.flexButton}
            />
          ))}
        </View>
      </Section>

      <Section title="Visual and interaction">
        <SettingRow label="Enhanced contrast">
          <Switch
            accessibilityLabel="Enhanced contrast"
            value={theme.profile.visual.contrast === 'enhanced'}
            onValueChange={(value) => preview('visual', { visual: { contrast: value ? 'enhanced' : 'system' } })}
          />
        </SettingRow>
        <SettingRow label="Reading-support spacing">
          <Switch
            accessibilityLabel="Reading-support spacing"
            value={theme.profile.visual.typography === 'reading-support'}
            onValueChange={(value) => preview('visual', { visual: { typography: value ? 'reading-support' : 'standard' } })}
          />
        </SettingRow>
        <SettingRow label="Reduced motion">
          <Switch
            accessibilityLabel="Reduced motion"
            value={theme.profile.visual.motion === 'reduced'}
            onValueChange={(value) => preview('visual', { visual: { motion: value ? 'reduced' : 'system' } })}
          />
        </SettingRow>
        <SettingRow label="Larger controls">
          <Switch
            accessibilityLabel="Larger controls"
            value={theme.profile.interaction.targetSize === 'enhanced'}
            onValueChange={(value) => preview('interaction', { interaction: { targetSize: value ? 'enhanced' : 'standard' } })}
          />
        </SettingRow>
      </Section>

      <View accessibilityLiveRegion="polite" style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[rowText, { fontWeight: '700' }]}>
          {experience.hasPreview ? 'Preview active' : 'No unsaved preview'}
        </Text>
        <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(14), lineHeight: theme.lineHeight(14) }}>
          Preview changes affect the interface immediately so you can evaluate them before saving.
        </Text>
      </View>

      <View style={styles.actions}>
        <AccessibleButton label="Keep preview" onPress={() => void keep()} disabled={!experience.hasPreview} />
        <AccessibleButton label="Cancel preview" variant="secondary" onPress={experience.discardPreview} disabled={!experience.hasPreview} />
        <AccessibleButton label="Undo last saved change" variant="secondary" onPress={() => void undo()} disabled={!experience.canUndo} />
        <AccessibleButton label="Reset experience" variant="danger" onPress={() => void reset()} />
      </View>

      <Section title="Privacy">
        <SettingRow label="Share anonymous product analytics">
          <Switch
            accessibilityLabel="Share anonymous product analytics"
            accessibilityHint="Allows coarse product events. Search terms, book titles, reading history, notes, and accessibility preferences are excluded."
            value={analyticsConsent.enabled}
            onValueChange={(value) => void analyticsConsent.setEnabled(value)}
          />
        </SettingRow>
        <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(14), lineHeight: theme.lineHeight(14) }}>
          Off by default. Session replay is disabled. AccessiBooks does not send search terms, book identity, passage text, notes, or accessibility preference values to PostHog.
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const theme = useAaxTheme();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.text, fontSize: theme.scale(20), lineHeight: theme.lineHeight(20), fontWeight: '700' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function SettingRow({ label, children }: React.PropsWithChildren<{ label: string }>) {
  const theme = useAaxTheme();
  return (
    <View style={[styles.settingRow, { minHeight: theme.targetSize }]}>
      <Text style={{ color: theme.colors.text, fontSize: theme.scale(16), lineHeight: theme.lineHeight(16), flex: 1 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 18, paddingBottom: 48 },
  section: { gap: 12 },
  settingRow: { flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'space-between' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flexButton: { flexGrow: 1 },
  previewCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  actions: { gap: 10 },
});
