import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookCard } from "@/components/book-card";
import { AdBanner } from "@/components/ad-banner";
import { ContinueListening } from "@/components/continue-listening";
import { GenreCards } from "@/components/genre-cards";
import { ForYouSection } from "@/components/for-you-section";
import { Search, Library as LibraryIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LibraryProps {
  onSelectBook: (book: Book) => void;
}

export function Library({ onSelectBook }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { user } = useAuth();

  const { data: books = [], isLoading, error } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  // Memoize filtered and sorted books to avoid recalculating on every render
  const filteredAndSortedBooks = useMemo(() => {
    const lowerSearchQuery = searchQuery.toLowerCase();
    const lowerSelectedGenre = selectedGenre?.toLowerCase();
    
    return books
      .filter(book => {
        const matchesSearch = 
          book.title.toLowerCase().includes(lowerSearchQuery) ||
          book.author.toLowerCase().includes(lowerSearchQuery) ||
          (book.genre && book.genre.toLowerCase().includes(lowerSearchQuery));
        
        const matchesGenre = !selectedGenre || 
          (book.genre && book.genre.toLowerCase().includes(lowerSelectedGenre!));
        
        return matchesSearch && matchesGenre;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "author":
            return a.author.localeCompare(b.author);
          case "duration":
            return a.duration - b.duration;
          case "recent":
            return (b.publishedYear || 0) - (a.publishedYear || 0);
          default:
            return a.title.localeCompare(b.title);
        }
      });
  }, [books, searchQuery, selectedGenre, sortBy]);

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre || null);
    setSearchQuery("");
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-lg" data-testid="text-error">
          Failed to load audiobooks. Please try again later.
        </p>
      </div>
    );
  }

  const showPersonalizedSections = user && !searchQuery && !isLoading;

  return (
    <div>
      {/* Continue Listening - only show when logged in and not searching */}
      {showPersonalizedSections && (
        <ContinueListening onSelectBook={onSelectBook} books={books} />
      )}

      {/* For You recommendations - only show when logged in and not searching */}
      {showPersonalizedSections && (
        <ForYouSection books={books} onSelectBook={onSelectBook} />
      )}

      {/* Genre browsing */}
      {!isLoading && books.length > 0 && !searchQuery && (
        <GenreCards 
          books={books} 
          onGenreSelect={handleGenreSelect}
          selectedGenre={selectedGenre}
        />
      )}

      {/* Ad banner for free users */}
      <AdBanner variant="library" />

      {/* Search and filters */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <LibraryIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold">
            {selectedGenre ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)}` : "All Audiobooks"}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md w-full">
            <label htmlFor="search-books" className="sr-only">
              Search audiobooks
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
              <Input
                id="search-books"
                type="search"
                placeholder="Title, author, or genre…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setSelectedGenre(null);
                }}
                className="pl-10 rounded-xl border-border"
                data-testid="input-search"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="sort-books" className="text-sm font-medium text-muted-foreground">
              Sort
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 rounded-xl" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Books grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedBooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg" data-testid="text-no-books">
            {searchQuery ? "No audiobooks found matching your search." : "No audiobooks available."}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
          role="list"
          aria-label="Audiobook library"
          data-testid="grid-books"
        >
          {filteredAndSortedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onPlayBook={onSelectBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
