import { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, LayoutRectangle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
}

export default function JuegoUnirScreen() {
  const router = useRouter();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [pairs, setPairs] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Lógica de gestos y dibujo
  const [karinaLayouts, setKarinaLayouts] = useState<Record<string, LayoutRectangle>>({});
  const [espanolLayouts, setEspanolLayouts] = useState<Record<string, LayoutRectangle>>({});
  const [karinaColX, setKarinaColX] = useState(0);
  const [espanolColX, setEspanolColX] = useState(0);
  const containerRef = useRef<View>(null);
  const [containerLayout, setContainerLayout] = useState<LayoutRectangle | null>(null);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const endX = useSharedValue(0);
  const endY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lineColor = useSharedValue('rgba(46, 125, 50, 0.5)'); // Verde traslúcido inicial
  const [activeKarina, setActiveKarina] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  async function loadWords() {
    setLoading(true);
    const { data } = await supabase
      .from('words')
      .select('id, palabra_karina, traduccion_espanol')
      .limit(50);
    if (data) {
      const words = shuffleArray(data as Word[]);
      setAllWords(words);
      startRound(words);
    }
    setLoading(false);
  }

  function startRound(words: Word[]) {
    const selected = shuffleArray(words).slice(0, 4);
    setPairs(selected);
    setMatched(new Set());
    setActiveKarina(null);
  }

  function nextRound() {
    if (round >= 3) {
      setGameOver(true);
      return;
    }
    setRound((r) => r + 1);
    startRound(allWords);
  }

  const [karinaWords, setKarinaWords] = useState<string[]>([]);
  const [espanolWords, setEspanolWords] = useState<string[]>([]);

  useEffect(() => {
    if (pairs.length > 0) {
      setKarinaWords(shuffleArray(pairs.map((w) => w.palabra_karina)));
      setEspanolWords(shuffleArray(pairs.map((w) => w.traduccion_espanol)));
    }
  }, [pairs]);

  function evaluateConnection(karina: string, espanol: string) {
    const pair = pairs.find((p) => p.palabra_karina === karina);
    if (pair && pair.traduccion_espanol === espanol) {
      lineColor.value = '#2E7D32'; // Verde acierto
      setMatched((prev) => {
        const next = new Set(prev);
        next.add(karina);
        if (next.size === 4) {
          setTimeout(() => nextRound(), 1000);
        }
        return next;
      });
      setScore((s) => s + 10);
    } else {
      lineColor.value = '#C62828'; // Rojo error
    }

    // Ocultar la línea después de la retroalimentación
    setTimeout(() => {
      isDragging.value = false;
      lineColor.value = 'rgba(46, 125, 50, 0.5)';
    }, 500);
  }

  const gesture = Gesture.Pan()
    .onBegin((e) => {
      // Verificar si comenzó sobre una palabra Kariña no emparejada
      const x = e.x;
      const y = e.y;

      let foundWord: string | null = null;
      for (const [word, layout] of Object.entries(karinaLayouts)) {
        const absX = layout.x + karinaColX;
        if (
          x >= absX && x <= absX + layout.width &&
          y >= layout.y && y <= layout.y + layout.height
        ) {
          runOnJS(setActiveKarina)(word);
          foundWord = word;
          break;
        }
      }

      if (foundWord && !matched.has(foundWord)) {
        startX.value = x;
        startY.value = y;
        endX.value = x;
        endY.value = y;
        isDragging.value = true;
      }
    })
    .onUpdate((e) => {
      if (isDragging.value) {
        endX.value = e.x;
        endY.value = e.y;
      }
    })
    .onEnd((e) => {
      if (isDragging.value) {
        const x = e.x;
        const y = e.y;

        let foundEspanol: string | null = null;
        for (const [word, layout] of Object.entries(espanolLayouts)) {
          const absX = layout.x + espanolColX;
          if (
            x >= absX && x <= absX + layout.width &&
            y >= layout.y && y <= layout.y + layout.height
          ) {
            foundEspanol = word;
            break;
          }
        }

        if (foundEspanol && activeKarina) {
          runOnJS(evaluateConnection)(activeKarina, foundEspanol);
        } else {
          isDragging.value = false;
        }
        runOnJS(setActiveKarina)(null);
      }
    });

  const animatedLineProps = useAnimatedStyle(() => {
    return {
      opacity: isDragging.value ? 1 : 0,
    };
  });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ fontSize: 56 }}>🎉</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1A2E1A', marginTop: 16 }}>¡Juego terminado!</Text>
        <Text style={{ fontSize: 18, color: '#F59E0B', fontWeight: '800', marginTop: 8 }}>{score} puntos</Text>
        <Pressable onPress={() => { setGameOver(false); setScore(0); setRound(1); loadWords(); }} style={{ marginTop: 24 }}>
          <View style={{ backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Jugar otra vez</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>← Volver a juegos</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
        <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#FFF', fontSize: 16 }}>←</Text>
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Juegos</Text>
            </View>
          </Pressable>
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>🔗 Une las palabras</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Ronda {round} de 3</Text>
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>⭐ {score} pts</Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }} scrollEnabled={false} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Arrastra desde Kariña hasta su traducción</Text>

            <GestureDetector gesture={gesture}>
              <View
                ref={containerRef}
                onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}
                style={{ flexDirection: 'row', gap: 12, position: 'relative' }}
              >
                {/* SVG Layer for Drawing Lines */}
                {containerLayout && (
                  <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                    <Svg width="100%" height="100%">
                      <AnimatedLine
                        x1={startX} y1={startY}
                        x2={endX} y2={endY}
                        stroke={lineColor}
                        strokeWidth="4"
                        style={animatedLineProps}
                      />
                    </Svg>
                  </View>
                )}

                <View
                  onLayout={(e) => setKarinaColX(e.nativeEvent.layout.x)}
                  style={{ flex: 1, gap: 10 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32', marginBottom: 4 }}>KARIÑA</Text>
                  {karinaWords.map((word) => (
                    <View
                      key={word}
                      onLayout={(e) => {
                        setKarinaLayouts(prev => ({ ...prev, [word]: e.nativeEvent.layout }));
                      }}
                      style={{
                        backgroundColor: matched.has(word) ? '#E8F5E9' : activeKarina === word ? '#2E7D3230' : '#FFF',
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 2,
                        borderColor: matched.has(word) ? '#2E7D32' : activeKarina === word ? '#2E7D32' : '#F0EDE8',
                        alignItems: 'center',
                        opacity: matched.has(word) ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A' }}>{word}</Text>
                      {matched.has(word) && <Text style={{ fontSize: 18, marginTop: 4 }}>✅</Text>}
                    </View>
                  ))}
                </View>

                <View
                  onLayout={(e) => setEspanolColX(e.nativeEvent.layout.x)}
                  style={{ flex: 1, gap: 10 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1565C0', marginBottom: 4 }}>ESPAÑOL</Text>
                  {espanolWords.map((word) => {
                    const isMatched = pairs.some((p) => p.traduccion_espanol === word && matched.has(p.palabra_karina));
                    return (
                      <View
                        key={word}
                        onLayout={(e) => {
                          setEspanolLayouts(prev => ({ ...prev, [word]: e.nativeEvent.layout }));
                        }}
                        style={{
                          backgroundColor: isMatched ? '#E8F5E9' : '#FFF',
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 2,
                          borderColor: isMatched ? '#2E7D32' : '#F0EDE8',
                          alignItems: 'center',
                          opacity: isMatched ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A2E1A' }}>{word}</Text>
                        {isMatched && <Text style={{ fontSize: 18, marginTop: 4 }}>✅</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            </GestureDetector>
          </ScrollView>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
