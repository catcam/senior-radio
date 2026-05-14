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

// Popis radio postaja koje aplikacija podržava.
// slug se koristi i za URL scraping i kao ključ u state objektima.
const STATIONS = [
  { slug: 'vijesti', label: 'VIJESTI' },
  { slug: 'dnevnik', label: 'DNEVNIK' },
];

export default function App() {

  // Ref na aktivni Expo Audio.Sound objekt – koristimo ref umjesto state jer
  // promjene zvuka ne smiju trigerirati re-render, samo ih trebamo pratiti.
  const soundRef = useRef(null);

  // slug postaje koja trenutno svira, ili null ako ništa ne svira
  const [playing, setPlaying] = useState(null);

  // slug postaje koja se učitava (spinner), ili null
  const [loading, setLoading] = useState(null);

  // Relativni napredak reprodukcije od 0 do 1, koristi se za progress bar
  const [progress, setProgress] = useState(0);

  // Ukupno trajanje trenutne snimke u milisekundama
  const [duration, setDuration] = useState(0);

  // Proteklo vrijeme od početka reprodukcije u milisekundama
  const [elapsed, setElapsed] = useState(0);

  // true ako se reproducira offline kopija iz cache-a umjesto live streama
  const [offlineWarning, setOfflineWarning] = useState(false);

  // Mapa slug → { broadcastTime, caption } s metapodacima zadnje dohvaćene emisije
  const [trackInfo, setTrackInfo] = useState({});

  useEffect(() => {
    // Konfiguracija audio sessiona – mora se postaviti jednom pri pokretanju.
    // playsInSilentModeIOS: zvuk svira čak i kad je iPhone na tihom modu.
    // staysActiveInBackground: reprodukcija se nastavlja kad korisnik izađe iz aplikacije.
    // allowsRecordingIOS: false jer ova aplikacija samo reproducira, ne snima.
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      allowsRecordingIOS: false,
    });
    return () => {
      // Cleanup pri unmountu – oslobađamo audio resurse da ne ostanu u memoriji
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  /**
   * Zaustavlja i oslobađa trenutno aktivni zvuk te resetira sav playback state.
   * Poziva se i pri eksplicitnom stopu i prije pokretanja nove postaje.
   */
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

  /**
   * Glavni handler za pritisak na gumb postaje.
   * Ako je postaja već aktivna – stopira je. Inače dohvaća track i počinje reprodukciju.
   * U slučaju greške, invalidira cache da sljedeći pokušaj ne koristi pokvarene podatke.
   */
  const handlePress = useCallback(async (slug) => {
    // Drugi pritisak na istu postaju = stop
    if (playing === slug) {
      await stopCurrent();
      return;
    }
    // Ako nešto drugo svira, zaustavimo to prije pokretanja novog
    if (playing) await stopCurrent();

    setLoading(slug);
    try {
      const track = await fetchTrack(slug);

      // Obavještavamo korisnika da sluša cached kopiju, ne live stream
      if (track.offline) setOfflineWarning(true);

      // Čuvamo metapodatke (datum emitiranja, naslov) za prikaz ispod gumba
      setTrackInfo(prev => ({ ...prev, [slug]: { broadcastTime: track.broadcastTime, caption: track.caption } }));

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true },
        // Status callback – poziva se periodično dok audio svira
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            // Snimka je završila – resetiramo UI u početno stanje
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
            // Izbjegavamo dijeljenje s nulom dok se trajanje još nije učitalo
            setProgress(dur > 0 ? pos / dur : 0);
          }
        }
      );
      soundRef.current = sound;
      setPlaying(slug);
      // Sprečavamo da ekran ugasi zaslon dok je emisija aktivna
      activateKeepAwakeAsync();
    } catch (err) {
      Alert.alert('Greška', describeError(err));
      // Brišemo cache jer je mogao biti razlog greške (npr. pokvareni JSON)
      invalidateCache(slug);
    } finally {
      setLoading(null);
    }
  }, [playing, stopCurrent]);

  /**
   * Pretvara milisekunde u format "M:SS" za prikaz timera.
   */
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

      <Text style={styles.credit}>Nikša Barlović & Claude</Text>
    </View>
  );
}

// Paleta boja definirana centralno kako bi svi elementi ostali vizualno konzistentni
const COLORS = {
  bg: '#0B1F4D',          // tamno plava pozadina
  btn: '#1B3A8A',         // plavi gumb u mirovanju
  btnPlaying: '#C0392B',  // crveni gumb dok svira – jasni vizualni signal aktivnosti
  text: '#FFFFFF',
  subtext: '#8FA0C8',     // prigušena plava za sekundarne informacije
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
  credit: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 11,
    marginTop: 32,
    letterSpacing: 0.5,
  },
});
