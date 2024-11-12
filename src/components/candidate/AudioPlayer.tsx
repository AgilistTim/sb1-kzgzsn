import { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  audioBlob: Blob;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackError?: (error: Error) => void;
}

export default function AudioPlayer({
  audioBlob,
  onPlaybackStart,
  onPlaybackEnd,
  onPlaybackError
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const playAudio = async () => {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        const url = URL.createObjectURL(audioBlob);
        audioRef.current.src = url;
        
        audioRef.current.onplay = () => onPlaybackStart?.();
        audioRef.current.onended = () => {
          onPlaybackEnd?.();
          URL.revokeObjectURL(url);
        };
        audioRef.current.onerror = () => {
          onPlaybackError?.(new Error('Audio playback failed'));
          URL.revokeObjectURL(url);
        };

        await audioRef.current.play();
      } catch (error) {
        console.error('Audio play error:', error);
        onPlaybackError?.(error instanceof Error ? error : new Error('Playback failed'));
      }
    };

    playAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [audioBlob]);

  return null;
}