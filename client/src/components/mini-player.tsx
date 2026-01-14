import { useAudioContext } from "@/contexts/AudioContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, ChevronUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MiniPlayerProps {
  onExpand?: () => void;
}

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const {
    currentBook,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    togglePlayPause,
    skip,
    seekTo,
    formatTime,
  } = useAudioContext();

  if (!currentBook) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg"
        role="region"
        aria-label="Audio player"
        data-testid="mini-player"
      >
        <div className="h-1 bg-secondary">
          <div 
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {currentBook.coverImage ? (
              <img
                src={currentBook.coverImage}
                alt={`Cover of ${currentBook.title}`}
                className="h-12 w-12 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                <Play className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate" data-testid="mini-player-title">
                {currentBook.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {currentBook.author}
              </p>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <div className="w-32">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={([value]) => seekTo(value)}
                  aria-label="Playback progress"
                  data-testid="mini-player-progress"
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => skip(-30)}
                aria-label="Skip back 30 seconds"
                data-testid="mini-player-skip-back"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={togglePlayPause}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
                data-testid="mini-player-play-pause"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => skip(30)}
                aria-label="Skip forward 30 seconds"
                data-testid="mini-player-skip-forward"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              {onExpand && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 ml-2"
                  onClick={onExpand}
                  aria-label="Expand player"
                  data-testid="mini-player-expand"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
