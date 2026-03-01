import { Book } from "@shared/schema";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PlayerProps {
  book: Book | null;
  onBackToLibrary: () => void;
}

export function Player({ book, onBackToLibrary }: PlayerProps) {
  if (!book) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-4" data-testid="text-no-book">
          No book selected. Please select a book from the library.
        </p>
        <Button onClick={onBackToLibrary} data-testid="button-back-to-library">
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={onBackToLibrary}
          data-testid="button-back-to-library"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Library
        </Button>
      </div>
      
      <AudioPlayer book={book} />
    </div>
  );
}
