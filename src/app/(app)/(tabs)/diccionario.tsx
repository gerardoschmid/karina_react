import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { supabase } from '@/client/supabase';
import { DictionaryAudioButton } from '@/components/DictionaryAudioButton';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
  modules: { titulo_espanol: string; color: string }[] | null;
}

const AUDIO_FILES: Record<string, any> = {
  aau: require('../../../../assets/sounds/aau.mp3'),
  mojko: require('../../../../assets/sounds/mojko.mp3'),
  nana: require('../../../../assets/sounds/nana.mp3'),
  nakon: require('../../../../assets/sounds/nakon.mp3'),
};

export default function DiccionarioScreen() {
  const [words, setWords] = useState<Word[]>([]);
  const [filtered, setFiltered] = useState<Word[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const player = useAudioPlayer(null);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.playing && status.currentTime >= status.duration && status.duration > 0) {
        setPlayingId(null);
      }
    });
    return () => subscription.remove();
  }, [player]);

  async function loadWords() {
    setLoading(true);
    const { data } = await supabase
      .from('words')
      .select('id, palabra_karina, traduccion_espanol, modules(titulo_espanol, color)')
      .order('palabra_karina');

    if (data) {
      const typed = data as unknown as Word[];
      setWords(typed);
      setFiltered(typed);
    }
    setLoading(false);
  }

  async function handlePlayAudio(word: Word) {
    const audioSource = AUDIO_FILES[word.palabra_karina.toLowerCase()];
    if (!audioSource) return;

    if (playingId === word.id) {
      player.pause();
      setPlayingId(null);
      return;
    }

    try {
      setPlayingId(word.id);
      await player.replace(audioSource);
      player.play();
    } catch (error) {
      console.error('Error al reproducir audio:', error);
      setPlayingId(null);
    }
  }

  function handleSearch(text: string) {
    setSearch(text);
    const q = text.toLowerCase().trim();
    if (!q) {
      setFiltered(words);
      return;
    }
    setFiltered(
      words.filter(
        (w) =>
          w.palabra_karina.toLowerCase().includes(q) ||
          w.traduccion_espanol.toLowerCase().includes(q)
      )
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: '#1B5E20', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>KARIÑA · REFERENCIA</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 }}>Diccionario</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>{words.length} palabras registradas</Text>
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar palabra en Kariña o español..."
          placeholderTextColor="#888"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            color: '#1A2E1A',
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 32 }}>🔍</Text>
            <Text style={{ fontSize: 14, color: '#888', marginTop: 8 }}>No se encontraron palabras</Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasAudio = !!AUDIO_FILES[item.palabra_karina.toLowerCase()];
          const isPlaying = playingId === item.id;
          const color = item.modules?.[0]?.color || '#1B5E20';

          return (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: '#F0EDE8',
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 40,
                  borderRadius: 4,
                  backgroundColor: color,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{item.palabra_karina}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.traduccion_espanol}</Text>
                {item.modules && item.modules[0] && (
                  <Text style={{ fontSize: 10, color: color, fontWeight: '600', marginTop: 4 }}>
                    {item.modules[0].titulo_espanol}
                  </Text>
                )}
              </View>
              <DictionaryAudioButton
                hasAudio={hasAudio}
                isPlaying={isPlaying}
                onPress={() => handlePlayAudio(item)}
                color={color}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
