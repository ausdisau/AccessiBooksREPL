import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { Book, Progress } from "@shared/schema";
import { localStorageService } from "@/lib/storage";

interface AudioContextType {
  currentBook: Book | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  setCurrentBook: (book: Book | null) => void;
  togglePlayPause: () => Promise<void>;
  skip: (seconds: number) => void;
  seekTo: (time: number) => void;
  changeSpeed: (delta: number) => void;
  formatTime: (seconds: number) => string;
  playBook: (book: Book) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudioContext must be used within AudioProvider");
  }
  return context;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentBook) {
      const progress = localStorageService.getProgress(currentBook.id);
      if (progress) {
        setCurrentTime(progress.currentTime);
        if (audioRef.current) {
          audioRef.current.currentTime = progress.currentTime;
        }
      }
    }
  }, [currentBook?.id]);

  useEffect(() => {
    if (!currentBook) return;

    const interval = setInterval(() => {
      if (isPlaying && currentTime > 0) {
        const progress: Progress = {
          bookId: currentBook.id,
          currentTime,
          lastPlayed: new Date().toISOString(),
        };
        localStorageService.saveProgress(progress);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentBook?.id, isPlaying, currentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsLoading(false);
      console.error("Audio failed to load");
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && currentBook) {
      audioRef.current.src = `/api/stream/${currentBook.id}`;
      audioRef.current.load();
    }
  }, [currentBook?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedTime = Math.max(0, Math.min(duration, time));
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  };

  const changeSpeed = (delta: number) => {
    const newRate = Math.max(0.6, Math.min(3.0, playbackRate + delta));
    setPlaybackRate(newRate);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00:00";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const playBook = (book: Book) => {
    setCurrentBook(book);
    setTimeout(async () => {
      const audio = audioRef.current;
      if (audio) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("Failed to auto-play:", error);
        }
      }
    }, 100);
  };

  return (
    <AudioContext.Provider
      value={{
        currentBook,
        audioRef,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        isLoading,
        setCurrentBook,
        togglePlayPause,
        skip,
        seekTo,
        changeSpeed,
        formatTime,
        playBook,
      }}
    >
      <audio ref={audioRef} preload="metadata" />
      {children}
    </AudioContext.Provider>
  );
}
