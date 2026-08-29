import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { Book } from '@/domain/types';
import { accessiBooksApi } from '@/services/api';
import { useSafeAnalytics } from '@/services/analytics';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { AccessibleButton } from '@/components/AccessibleButton';
import { useExperience } from '@/state/experience';
import { useAaxTheme } from '@/theme/useAaxTheme';

export default function PlayerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setBook(await accessiBooksApi.getBook(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the audiobook.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingState label="Loading audiobook" />;
  if (error || !book) return <ErrorState message={error ?? 'Audiobook not found.'} onRetry={() => void load()} />;
  return <AudioPlayer book={book} />;
}

function AudioPlayer({ book }: { book: Book }) {
  const theme = useAaxTheme();
  const { profile } = useExperience();
  const capture = useSafeAnalytics();
  const player = useAudioPlayer(accessiBooksApi.streamUrl(book.id), { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(Math.min(2, Math.max(0.5, profile.reading.playbackRate)));

  useEffect(() => {
    capture('screen_viewed', { screen: 'player' });
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    return () => {
      player.setActiveForLockScreen(false);
    };
  }, [capture, player]);

  useEffect(() => {
    player.setPlaybackRate(rate);
  }, [player, rate]);

  const play = () => {
    player.setActiveForLockScreen(true, {
      title: book.title,
      artist: book.author,
      artworkUrl: book.coverImage ?? undefined,
    });
    player.play();
    capture('playback_started', { source: book.source });
  };

  const pause = () => {
    player.pause();
    capture('playback_paused', { source: book.source });
  };

  const skip = (seconds: number) => {
    const next = Math.max(0, Math.min(status.duration || Number.MAX_SAFE_INTEGER, status.currentTime + seconds));
    void player.seekTo(next);
  };

  const changeRate = (delta: number) => {
    const next = Math.round(Math.min(2, Math.max(0.5, rate + delta)) * 10) / 10;
    setRate(next);
  };

  const progress = status.duration > 0
    ? `${formatTime(status.currentTime)} of ${formatTime(status.duration)}`
    : formatTime(status.currentTime);

  return (
    <View style={[styles.player, { backgroundColor: theme.colors.background }]}>
      <Text
        accessibilityRole="header"
        style={{ color: theme.colors.text, fontSize: theme.scale(26), lineHeight: theme.lineHeight(26), fontWeight: '800', textAlign: 'center' }}
      >
        {book.title}
      </Text>
      <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(17), lineHeight: theme.lineHeight(17), textAlign: 'center' }}>
        {book.author}
      </Text>

      <View accessibilityLiveRegion="polite" style={[styles.statusCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text accessibilityLabel={`Playback progress ${progress}`} style={{ color: theme.colors.text, fontSize: theme.scale(18), textAlign: 'center' }}>
          {progress}
        </Text>
        {status.isBuffering ? (
          <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(14), textAlign: 'center' }}>Buffering…</Text>
        ) : null}
        {status.error ? (
          <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: theme.scale(14), textAlign: 'center' }}>
            Playback error: {status.error}
          </Text>
        ) : null}
      </View>

      <View style={styles.controlRow}>
        <AccessibleButton label="Back 15 seconds" variant="secondary" onPress={() => skip(-15)} style={styles.flexButton} />
        <AccessibleButton
          label={status.playing ? 'Pause' : 'Play'}
          onPress={status.playing ? pause : play}
          style={styles.flexButton}
        />
        <AccessibleButton label="Forward 15 seconds" variant="secondary" onPress={() => skip(15)} style={styles.flexButton} />
      </View>

      <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: theme.scale(18), fontWeight: '700', textAlign: 'center' }}>
        Playback speed {rate.toFixed(1)} times
      </Text>
      <View style={styles.controlRow}>
        <AccessibleButton label="Slower" variant="secondary" onPress={() => changeRate(-0.1)} disabled={rate <= 0.5} style={styles.flexButton} />
        <AccessibleButton label="Faster" variant="secondary" onPress={() => changeRate(0.1)} disabled={rate >= 2} style={styles.flexButton} />
      </View>
      <Text style={{ color: theme.colors.mutedText, fontSize: theme.scale(14), lineHeight: theme.lineHeight(14), textAlign: 'center' }}>
        Speed changes are temporary for this listening session and do not silently alter your saved experience profile.
      </Text>
    </View>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  player: { flex: 1, padding: 20, gap: 18, justifyContent: 'center' },
  statusCard: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 8 },
  controlRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  flexButton: { flex: 1 },
});
