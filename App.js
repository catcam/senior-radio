import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { fetchTrack, describeError, invalidateCache } from './src/scraper';

const STATIONS = [
  { slug: 'vijesti', label: 'VIJESTI' },
  { slug: 'dnevnik', label: 'DNEVNIK' },
];

export default function App() {

  const soundRef = useRef(null);
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [offlineWarning, setOfflineWarning] = useState(false);
  const [trackInfo, setTrackInfo] = useState({});  // slug → { broadcastTime, caption }

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      allowsRecordingIOS: false,
    });
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const stopCurrent = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlaying(null);
    setProgress(0);
    setElapsed(0);
    setDuration(0);
    setOfflineWarning(false);
    deactivateKeepAwake();
  }, []);

  const handlePress = useCallback(async (slug) => {
    if (playing === slug) {
      await stopCurrent();
      return;
    }
    if (playing) await stopCurrent();

    setLoading(slug);
    try {
      const track = await fetchTrack(slug);
      if (track.offline) setOfflineWarning(true);
      setTrackInfo(prev => ({ ...prev, [slug]: { broadcastTime: track.broadcastTime, caption: track.caption } }));

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setPlaying(null);
            setProgress(0);
            setElapsed(0);
            setOfflineWarning(false);
            deactivateKeepAwake();
          } else {
            const dur = status.durationMillis || 0;
            const pos = status.positionMillis || 0;
            setDuration(dur);
            setElapsed(pos);
            setProgress(dur > 0 ? pos / dur : 0);
          }
        }
      );
      soundRef.current = sound;
      setPlaying(slug);
      activateKeepAwakeAsync();
    } catch (err) {
      Alert.alert('Greška', describeError(err));
      invalidateCache(slug);
    } finally {
      setLoading(null);
    }
  }, [playing, stopCurrent]);

  function formatMs(ms) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <Text style={styles.title}>Senior Radio</Text>
      <Text style={styles.subtitle}>HRT Radio</Text>

      <View style={styles.buttons}>
        {STATIONS.map(({ slug, label }) => {
          const isPlaying = playing === slug;
          const isLoading = loading === slug;
          return (
            <TouchableOpacity
              key={slug}
              style={[styles.btn, isPlaying && styles.btnPlaying]}
              onPress={() => handlePress(slug)}
              activeOpacity={0.75}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnText}>{isPlaying ? '■ ' + label : label}</Text>
                  {trackInfo[slug]?.broadcastTime && (
                    <Text style={styles.broadcastTime}>{trackInfo[slug].broadcastTime}</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {playing && (
        <View style={styles.progressBox}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.timer}>
            {formatMs(elapsed)}{duration > 0 ? ' / ' + formatMs(duration) : ''}
          </Text>
          {offlineWarning && (
            <Text style={styles.offlineNote}>Reproducira se snimljena kopija</Text>
          )}
        </View>
      )}
    </View>
  );
}

const COLORS = {
  bg: '#0B1F4D',
  btn: '#1B3A8A',
  btnPlaying: '#C0392B',
  text: '#FFFFFF',
  subtext: '#8FA0C8',
  progressTrack: '#2A3F7A',
  progressFill: '#4A90E2',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.subtext,
    fontSize: 16,
    marginBottom: 48,
  },
  buttons: {
    width: '100%',
    gap: 20,
  },
  btn: {
    backgroundColor: COLORS.btn,
    borderRadius: 16,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  btnPlaying: {
    backgroundColor: COLORS.btnPlaying,
  },
  btnText: {
    color: COLORS.text,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 2,
  },
  broadcastTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    marginTop: 6,
    fontWeight: '400',
  },
  progressBox: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.progressTrack,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.progressFill,
    borderRadius: 3,
  },
  timer: {
    color: COLORS.subtext,
    fontSize: 14,
    marginTop: 8,
  },
  offlineNote: {
    color: '#E8A838',
    fontSize: 13,
    marginTop: 6,
  },
});
