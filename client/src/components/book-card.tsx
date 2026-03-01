import { Book } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";

interface BookCardProps {
  book: Book;
  onPlayBook: (book: Book) => void;
  compact?: boolean;
}

export function BookCard({ book, onPlayBook, compact = false }: BookCardProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (compact) {
    return (
      <Card
        className="overflow-hidden rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group bg-card"
        data-testid={`card-book-${book.id}`}
        onClick={() => onPlayBook(book)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[3/4] overflow-hidden">
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt={`${book.title} book cover`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                data-testid={`img-cover-${book.id}`}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Play className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shadow-lg">
                <Play className="h-7 w-7 text-accent-foreground fill-accent-foreground ml-1" />
              </div>
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-display font-semibold text-sm line-clamp-2 mb-0.5" data-testid={`text-title-${book.id}`}>
              {book.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-author-${book.id}`}>
              {book.author}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              {book.audioUrl && <span aria-label="Audiobook">🎧</span>}
              {book.description && <span aria-label="Ebook">📖</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border hover:border-primary/30 hover:shadow-xl transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-card" data-testid={`card-book-${book.id}`}>
      <CardContent className="p-0">
        <div className="relative aspect-[3/4] overflow-hidden">
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={`${book.title} book cover`}
              className="w-full h-full object-cover"
              data-testid={`img-cover-${book.id}`}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Play className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-display text-lg font-semibold mb-1" data-testid={`text-title-${book.id}`}>
            {book.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-2" data-testid={`text-author-${book.id}`}>
            by {book.author}
          </p>
          <p className="text-sm text-muted-foreground mb-4" data-testid={`text-duration-${book.id}`}>
            {formatDuration(book.duration)}
          </p>
          <Button
            className="w-full rounded-lg bg-primary hover:bg-primary/90"
            onClick={() => onPlayBook(book)}
            data-testid={`button-play-${book.id}`}
          >
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />
            Play
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
