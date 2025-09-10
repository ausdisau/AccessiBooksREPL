import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { AccessiBooksLogo } from "@/components/accessibooks-logo";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Library } from "@/pages/library";
import { Player } from "@/pages/player";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Book } from "@shared/schema";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Button } from "@/components/ui/button";
import { Book as BookIcon, Play, LogOut, User } from "lucide-react";
import { Route, Switch } from "wouter";

type View = "library" | "player";

// Header component with user management
function AppHeader() {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <AccessiBooksLogo />

          <div className="flex items-center space-x-4">
            {/* Accessibility Controls */}
            <AccessibilityControls />
            
            {/* User Menu */}
            {user && (
              <div className="flex items-center space-x-2 pl-4 border-l border-border">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-username">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username
                    }
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  aria-label="Sign out"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MainApp() {
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:no-underline"
      >
        Skip to main content
      </a>

      {/* Header */}
      <AppHeader />

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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <ProtectedRoute path="/">
              <MainApp />
            </ProtectedRoute>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;