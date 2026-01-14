import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Book } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookCard } from "@/components/book-card";
import { AdBanner } from "@/components/ad-banner";
import { Search } from "lucide-react";

interface LibraryProps {
  onSelectBook: (book: Book) => void;
}

export function Library({ onSelectBook }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");

  const { data: books = [], isLoading, error } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const filteredAndSortedBooks = books
    .filter(book => 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.genre && book.genre.toLowerCase().includes(searchQuery.toLowerCase()))
    )
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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-lg" data-testid="text-error">
          Failed to load audiobooks. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search and filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <label htmlFor="search-books" className="sr-only">
              Search audiobooks
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
              <Input
                id="search-books"
                type="search"
                placeholder="Search by title, author, or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label htmlFor="sort-books" className="text-sm font-medium">
              Sort by:
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32" data-testid="select-sort">
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

      {/* Ad banner for free users */}
      <AdBanner variant="library" />

      {/* Books grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="w-full h-48 bg-muted rounded-md mb-4" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded mb-2 w-3/4" />
              <div className="h-3 bg-muted rounded mb-4 w-1/2" />
              <div className="h-10 bg-muted rounded" />
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
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
