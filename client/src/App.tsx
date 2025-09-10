import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { Library } from "@/pages/library";
import { Player } from "@/pages/player";
import { Book } from "@shared/schema";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Button } from "@/components/ui/button";
import { Headphones, Book as BookIcon, Play } from "lucide-react";

type View = "library" | "player";

function App() {
  const [currentView, setCurrentView] = useState<View>("library");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const { toggleHighContrast } = useAccessibility();

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setCurrentView("player");
  };

  const handleBackToLibrary = () => {
    setCurrentView("library");
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onHighContrast: toggleHighContrast,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          {/* Skip to main content link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:no-underline"
          >
            Skip to main content
          </a>

          {/* Header */}
          <header className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-primary flex items-center">
                    <Headphones className="h-8 w-8 mr-2" aria-hidden="true" />
                    AccessiBooks
                  </h1>
                </div>

                {/* Accessibility Controls */}
                <AccessibilityControls />
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="bg-card border-b border-border" role="tablist" aria-label="Main navigation">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <Button
                  variant="ghost"
                  className={`py-4 px-1 border-b-2 font-medium ${
                    currentView === "library"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={handleBackToLibrary}
                  role="tab"
                  aria-selected={currentView === "library"}
                  aria-controls="library-panel"
                  data-testid="tab-library"
                >
                  <BookIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                  Library
                </Button>
                
                <Button
                  variant="ghost"
                  className={`py-4 px-1 border-b-2 font-medium ${
                    currentView === "player"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => selectedBook && setCurrentView("player")}
                  disabled={!selectedBook}
                  role="tab"
                  aria-selected={currentView === "player"}
                  aria-controls="player-panel"
                  data-testid="tab-player"
                >
                  <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  Player
                </Button>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentView === "library" ? (
              <div
                id="library-panel"
                role="tabpanel"
                aria-labelledby="library-tab"
                data-testid="panel-library"
              >
                <Library onSelectBook={handleSelectBook} />
              </div>
            ) : (
              <div
                id="player-panel"
                role="tabpanel"
                aria-labelledby="player-tab"
                data-testid="panel-player"
              >
                <Player book={selectedBook} onBackToLibrary={handleBackToLibrary} />
              </div>
            )}
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
