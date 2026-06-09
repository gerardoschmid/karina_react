import React from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { LucideVolume2, LucideVolumeX, LucidePause, LucidePlay } from 'lucide-react-native';

interface DictionaryAudioButtonProps {
  onPress: () => void;
  isPlaying: boolean;
  isLoading?: boolean;
  hasAudio: boolean;
  color?: string;
}

export function DictionaryAudioButton({
  onPress,
  isPlaying,
  isLoading,
  hasAudio,
  color = '#1B5E20',
}: DictionaryAudioButtonProps) {
  if (!hasAudio) {
    return (
      <View style={{ opacity: 0.3, padding: 8 }}>
        <LucideVolumeX size={20} color="#888" />
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 8,
        borderRadius: 20,
        backgroundColor: isPlaying ? `${color}20` : pressed ? '#F0F0F0' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : isPlaying ? (
        <LucidePause size={20} color={color} fill={color} />
      ) : (
        <LucideVolume2 size={20} color={color} />
      )}
    </Pressable>
  );
}
