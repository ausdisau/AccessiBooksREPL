import { Book } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";

interface BookCardProps {
  book: Book;
  onPlayBook: (book: Book) => void;
}

export function BookCard({ book, onPlayBook }: BookCardProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

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
