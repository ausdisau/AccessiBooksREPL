import { Book } from "@shared/schema";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface BookSectionProps {
  title: string;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onSeeAll?: () => void;
  maxItems?: number;
}

export function BookSection({ title, books, onSelectBook, onSeeAll, maxItems = 5 }: BookSectionProps) {
  const displayedBooks = books.slice(0, maxItems);

  if (displayedBooks.length === 0) {
    return null;
  }

  return (
    <section className="py-8" aria-label={title}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl md:text-3xl font-semibold">{title}</h2>
        {(onSeeAll || books.length > maxItems) && (
          <Button
            variant="ghost"
            onClick={onSeeAll}
            className="text-muted-foreground hover:text-primary rounded-lg"
            data-testid={`button-see-all-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            See all
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {displayedBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onPlayBook={onSelectBook}
            compact
          />
        ))}
      </div>
    </section>
  );
}
