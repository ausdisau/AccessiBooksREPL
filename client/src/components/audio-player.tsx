import { useState } from "react";
import { Book } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { BookmarkList } from "./bookmark-list";
import { SleepTimer } from "./sleep-timer";
import { ChapterList } from "./chapter-list";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Minus, 
  Plus,
  Bookmark as BookmarkIcon,
  Loader2
} from "lucide-react";

interface AudioPlayerProps {
  book: Book;
}

export function AudioPlayer({ book }: AudioPlayerProps) {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isLoading,
    togglePlayPause,
    skip,
    seekTo,
    changeSpeed,
    formatTime,
  } = useAudioPlayer({
    bookId: book.id,
    audioUrl: `/api/stream/${book.id}`,
  });

  const { bookmarks, addBookmark, removeBookmark } = useBookmarks(book.id);
  const [bookmarkName, setBookmarkName] = useState("");
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | undefined>();
  const { toast } = useToast();

  const handleChapterSelect = (chapter: { id: string; title: string; audioUrl: string }) => {
    setCurrentChapterId(chapter.id);
    if (audioRef.current) {
      audioRef.current.src = chapter.audioUrl;
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
    toast({
      title: "Now playing",
      description: chapter.title,
    });
  };

  const handleAddBookmark = () => {
    if (showBookmarkInput && bookmarkName.trim()) {
      const name = bookmarkName.trim() || `Bookmark at ${formatTime(currentTime)}`;
      addBookmark(name, currentTime);
      setBookmarkName("");
      setShowBookmarkInput(false);
    } else {
      setShowBookmarkInput(true);
      setBookmarkName(`Chapter at ${formatTime(currentTime)}`);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Book info header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {book.coverImage && (
              <img
                src={book.coverImage}
                alt={`${book.title} audiobook cover`}
                className="w-48 h-72 object-cover rounded-md mx-auto md:mx-0"
                data-testid="img-book-cover"
              />
            )}
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2" data-testid="text-book-title">
                {book.title}
              </h2>
              <p className="text-xl text-muted-foreground mb-4" data-testid="text-book-author">
                by {book.author}
              </p>
              {book.narrator && (
                <p className="text-muted-foreground mb-4" data-testid="text-book-narrator">
                  Narrated by {book.narrator}
                </p>
              )}
              {book.description && (
                <p className="text-sm text-muted-foreground" data-testid="text-book-description">
                  {book.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio player controls */}
      <Card>
        <CardContent className="p-6">
          {/* Progress section */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span aria-label="Current time" data-testid="text-current-time">
                {formatTime(currentTime)}
              </span>
              <span aria-label="Total duration" data-testid="text-total-duration">
                {formatTime(duration)}
              </span>
            </div>
            
            <Slider
              value={[progressPercentage]}
              onValueChange={([value]) => {
                const newTime = (value / 100) * duration;
                seekTo(newTime);
              }}
              max={100}
              step={0.1}
              className="w-full"
              aria-label="Audio progress"
              data-testid="slider-progress"
            />
          </div>

          {/* Main controls */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => skip(-15)}
              aria-label="Skip backward 15 seconds"
              data-testid="button-skip-backward"
            >
              <SkipBack className="h-5 w-5" aria-hidden="true" />
            </Button>
            
            <Button
              size="lg"
              onClick={togglePlayPause}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause audiobook" : "Play audiobook"}
              className="w-16 h-16"
              data-testid="button-play-pause"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Play className="h-6 w-6" aria-hidden="true" />
              )}
            </Button>
            
            <Button
              size="lg"
              variant="secondary"
              onClick={() => skip(15)}
              aria-label="Skip forward 15 seconds"
              data-testid="button-skip-forward"
            >
              <SkipForward className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Secondary controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <label htmlFor="speed-control" className="text-sm font-medium">
                Speed:
              </label>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => changeSpeed(-0.1)}
                  aria-label="Decrease playback speed"
                  data-testid="button-speed-down"
                >
                  <Minus className="h-3 w-3" aria-hidden="true" />
                </Button>
                
                <span className="w-12 text-center font-medium" data-testid="text-speed-display">
                  {playbackRate.toFixed(1)}x
                </span>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => changeSpeed(0.1)}
                  aria-label="Increase playback speed"
                  data-testid="button-speed-up"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <SleepTimer />
              
              {showBookmarkInput && (
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddBookmark();
                    } else if (e.key === "Escape") {
                      setShowBookmarkInput(false);
                      setBookmarkName("");
                    }
                  }}
                  placeholder="Bookmark name"
                  className="px-3 py-2 border border-border rounded-md text-sm"
                  autoFocus
                  data-testid="input-bookmark-name"
                />
              )}
              <Button
                onClick={handleAddBookmark}
                aria-label="Bookmark current position"
                data-testid="button-add-bookmark"
              >
                <BookmarkIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Bookmark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live region for screen reader updates */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="status-player"
      >
        {isPlaying ? "Playing" : "Paused"} at {formatTime(currentTime)} of {formatTime(duration)}, 
        speed {playbackRate.toFixed(1)}x
      </div>

      {/* Bookmarks section */}
      <BookmarkList
        bookmarks={bookmarks}
        onJumpTo={seekTo}
        onRemove={removeBookmark}
        formatTime={formatTime}
      />

      {/* Chapter navigation for LibriVox books */}
      {book.id.startsWith("librivox-") && (
        <ChapterList
          bookId={book.id}
          onChapterSelect={handleChapterSelect}
          currentChapterId={currentChapterId}
        />
      )}
    </div>
  );
}
