import { useContinueListening } from "@/hooks/use-listening-history";
import { Book } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader } from "@/components/loader";

interface ContinueListeningProps {
  onSelectBook: (book: Book) => void;
  books: Book[];
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m left`;
  }
  return `${mins}m left`;
}

function formatProgress(current: number, total: number | null): number {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

export function ContinueListening({ onSelectBook, books }: ContinueListeningProps) {
  const { data: continueItems = [], isLoading } = useContinueListening(10);

  if (isLoading) {
    return (
      <section className="mb-8" aria-label="Continue Listening">
        <h2 className="font-display text-xl font-semibold mb-4">Continue Listening</h2>
        <Loader variant="inline" message="Loading…" className="py-4" />
      </section>
    );
  }

  if (continueItems.length === 0) {
    return null;
  }

  const handlePlay = (item: typeof continueItems[0]) => {
    const matchingBook = books.find(b => b.id === item.bookId);
    if (matchingBook) {
      onSelectBook(matchingBook);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, item: typeof continueItems[0]) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePlay(item);
    }
  };

  return (
    <section className="mb-8" aria-label="Continue Listening">
      <h2 className="font-display text-xl font-semibold mb-4">Continue Listening</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {continueItems.map((item) => {
            const progress = formatProgress(item.currentTime, item.totalDuration);
            const timeLeft = item.totalDuration 
              ? formatTime(item.totalDuration - item.currentTime)
              : "";
            
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Continue ${item.bookTitle}`}
                className="flex-shrink-0 w-72 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-xl"
                onClick={() => handlePlay(item)}
                onKeyDown={(e) => handleCardKeyDown(e, item)}
              >
              <Card
                className="w-full cursor-pointer rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="relative w-16 h-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.bookCover ? (
                        <img
                          src={item.bookCover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Clock className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate" title={item.bookTitle}>
                        {item.bookTitle}
                      </h3>
                      {item.bookAuthor && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.bookAuthor}
                        </p>
                      )}
                      {timeLeft && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeLeft}
                        </p>
                      )}
                      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
