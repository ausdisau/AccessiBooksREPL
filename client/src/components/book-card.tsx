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
        className="hover:shadow-lg transition-shadow cursor-pointer group" 
        data-testid={`card-book-${book.id}`}
        onClick={() => onPlayBook(book)}
      >
        <CardContent className="p-3">
          <div className="relative">
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt={`${book.title} book cover`}
                className="w-full h-32 object-cover rounded-md mb-2"
                data-testid={`img-cover-${book.id}`}
              />
            ) : (
              <div className="w-full h-32 bg-muted rounded-md mb-2 flex items-center justify-center">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
              <Play className="h-10 w-10 text-white fill-white" />
            </div>
          </div>
          
          <h3 className="text-sm font-medium line-clamp-2" data-testid={`text-title-${book.id}`}>
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate" data-testid={`text-author-${book.id}`}>
            {book.author}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-ring" data-testid={`card-book-${book.id}`}>
      <CardContent className="p-6">
        {book.coverImage && (
          <img
            src={book.coverImage}
            alt={`${book.title} book cover`}
            className="w-full h-48 object-cover rounded-md mb-4"
            data-testid={`img-cover-${book.id}`}
          />
        )}
        
        <h3 className="text-lg font-semibold mb-2" data-testid={`text-title-${book.id}`}>
          {book.title}
        </h3>
        <p className="text-muted-foreground mb-2" data-testid={`text-author-${book.id}`}>
          by {book.author}
        </p>
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-duration-${book.id}`}>
          {formatDuration(book.duration)}
        </p>
        
        <Button
          className="w-full"
          onClick={() => onPlayBook(book)}
          data-testid={`button-play-${book.id}`}
        >
          <Play className="h-4 w-4 mr-2" aria-hidden="true" />
          Play Book
        </Button>
      </CardContent>
    </Card>
  );
}
