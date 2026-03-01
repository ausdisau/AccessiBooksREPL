import { useState, useMemo } from "react";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { AccessiBooksLogo } from "@/components/accessibooks-logo";
import { useAuth } from "@/hooks/useAuth";
import { Library } from "@/pages/library";
import { Player } from "@/pages/player";
import { Book } from "@shared/schema";
import { HeroSection } from "@/components/hero-section";
import { SubjectChips } from "@/components/subject-chips";
import { BookSection } from "@/components/book-section";
import { BookCard } from "@/components/book-card";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Book as BookIcon, Play, LogOut, User, Loader2, Mail, Lock, Eye, EyeOff, Crown, Settings, HardDrive } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AudioProvider, useAudioContext } from "@/contexts/AudioContext";
import { MiniPlayer } from "@/components/mini-player";
import { PremiumBadge } from "@/components/premium-badge";
import { SubscriptionCard } from "@/components/subscription-card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AdminStoragePage } from "@/pages/admin-storage";
import { AppLayout } from "@/components/app-layout";

type View = "library" | "player";

// Header component with user management
function AppHeader() {
  const { user } = useAuth();
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          <AccessiBooksLogo />

          <div className="flex items-center space-x-4">
            <AccessibilityControls />
            
            {user && (
              <div className="flex items-center space-x-2 pl-4 border-l border-border">
                <PremiumBadge showUpgrade />
                
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-username">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email || "User"
                    }
                  </span>
                </div>
                
                <a href="/admin/storage">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Admin storage"
                    data-testid="button-admin-storage"
                  >
                    <HardDrive className="h-4 w-4" />
                  </Button>
                </a>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Subscription settings"
                      data-testid="button-subscription"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <SubscriptionCard />
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
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

// Auth providers available
interface AuthProviders {
  local: boolean;
  facebook: boolean;
  microsoft: boolean;
  auth0: boolean;
  google: boolean;
  github: boolean;
  apple: boolean;
}

// Landing page for logged-out users - public catalog browsing
function LandingPage() {
  const { toggleHighContrast } = useAccessibility();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [showAllSection, setShowAllSection] = useState<string | null>(null);
  
  // Fetch books for catalog
  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });
  
  // Fetch available auth providers
  const { data: providers } = useQuery<AuthProviders>({
    queryKey: ["/api/auth/providers"],
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowLoginDialog(false);
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowLoginDialog(false);
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  useKeyboardShortcuts({
    onHighContrast: toggleHighContrast,
  });

  // Memoize subjects extraction to avoid recalculating on every render
  const subjects = useMemo(() => {
    return Array.from(new Set(
      books
        .map(book => book.genre?.toLowerCase())
        .filter(Boolean) as string[]
    ));
  }, [books]);

  // Memoize base collections (not affected by subject filter)
  const { allTrendingBooks, allNewArrivals, allDisabilityVoicesBooks } = useMemo(() => {
    const sortedNewArrivals = [...books].sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));
    const disabilityBooks = books.filter(book => 
      book.genre?.toLowerCase().includes("disability") ||
      book.title.toLowerCase().includes("disability") ||
      book.author.toLowerCase().includes("disability")
    );
    
    return {
      allTrendingBooks: books.slice(0, 10),
      allNewArrivals: sortedNewArrivals,
      allDisabilityVoicesBooks: disabilityBooks,
    };
  }, [books]);

  // Memoize filtered books function
  const getFilteredBooks = useMemo(() => {
    return (bookList: Book[]) => {
      if (!selectedSubject) return bookList;
      const lowerSubject = selectedSubject.toLowerCase();
      return bookList.filter(book => 
        book.genre?.toLowerCase().includes(lowerSubject)
      );
    };
  }, [selectedSubject]);

  // Memoize organized books into sections
  const { trendingBooks, newArrivals, disabilityVoicesBooks } = useMemo(() => {
    const filtered = getFilteredBooks;
    return {
      trendingBooks: filtered(allTrendingBooks).slice(0, 5),
      newArrivals: filtered(allNewArrivals).slice(0, 5),
      disabilityVoicesBooks: filtered(allDisabilityVoicesBooks).slice(0, 5),
    };
  }, [allTrendingBooks, allNewArrivals, allDisabilityVoicesBooks, getFilteredBooks]);

  // Get all books for "See all" sections
  const getSeeAllBooks = (section: string): Book[] => {
    if (!selectedSubject) {
      switch (section) {
        case "trending": return allTrendingBooks;
        case "new-arrivals": return allNewArrivals;
        case "disability-voices": return allDisabilityVoicesBooks;
        default: return books;
      }
    }
    // Apply subject filter
    const baseBooks = section === "trending" ? allTrendingBooks :
                     section === "new-arrivals" ? allNewArrivals :
                     section === "disability-voices" ? allDisabilityVoicesBooks : books;
    return getFilteredBooks(baseBooks);
  };

  const handleBrowseCatalog = () => {
    setSelectedSubject(null);
    setShowAllSection(null);
    document.getElementById("book-sections")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleExploreSubjects = () => {
    document.getElementById("subject-chips")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBookSelect = (book: Book) => {
    // If not logged in, show login dialog
    setShowLoginDialog(true);
    toast({
      title: "Sign in required",
      description: "Please sign in to access audiobooks and ebooks.",
      variant: "default",
    });
  };

  const handleSeeAll = (section: string) => {
    setShowAllSection(showAllSection === section ? null : section);
    // Scroll to show all section
    setTimeout(() => {
      document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      registerMutation.mutate(formData);
    } else {
      loginMutation.mutate({ email: formData.email, password: formData.password });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <AccessiBooksLogo />
          <div className="flex items-center gap-3">
            <AccessibilityControls />
            <Button
              variant="outline"
              className="rounded-xl border-2"
              onClick={() => setShowLoginDialog(true)}
            >
              Sign In
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <HeroSection 
          onBrowseCatalog={handleBrowseCatalog}
          onExploreSubjects={handleExploreSubjects}
        />

        {/* Subject Chips */}
        <div id="subject-chips">
          <SubjectChips
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSubjectSelect={setSelectedSubject}
          />
        </div>

        {/* Book Sections */}
        <div id="book-sections" className="space-y-12">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading books...</p>
            </div>
          ) : (
            <>
              <BookSection
                title="Trending now"
                books={trendingBooks}
                onSelectBook={handleBookSelect}
                onSeeAll={() => handleSeeAll("trending")}
                maxItems={5}
              />
              
              {showAllSection === "trending" && (
                <div id="section-trending" className="py-8 border-t">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">All Trending Books</h3>
                    <Button variant="ghost" onClick={() => setShowAllSection(null)}>
                      Show less
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {getSeeAllBooks("trending").map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onPlayBook={handleBookSelect}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <BookSection
                title="New arrivals"
                books={newArrivals}
                onSelectBook={handleBookSelect}
                onSeeAll={() => handleSeeAll("new-arrivals")}
                maxItems={5}
              />
              
              {showAllSection === "new-arrivals" && (
                <div id="section-new-arrivals" className="py-8 border-t">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">All New Arrivals</h3>
                    <Button variant="ghost" onClick={() => setShowAllSection(null)}>
                      Show less
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {getSeeAllBooks("new-arrivals").map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onPlayBook={handleBookSelect}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <BookSection
                title="Disability voices"
                books={disabilityVoicesBooks}
                onSelectBook={handleBookSelect}
                onSeeAll={() => handleSeeAll("disability-voices")}
                maxItems={5}
              />
              
              {showAllSection === "disability-voices" && (
                <div id="section-disability-voices" className="py-8 border-t">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">All Disability Voices Books</h3>
                    <Button variant="ghost" onClick={() => setShowAllSection(null)}>
                      Show less
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {getSeeAllBooks("disability-voices").map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onPlayBook={handleBookSelect}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {isRegistering ? "Create Account" : "Sign In"}
              </CardTitle>
              <CardDescription className="text-center">
                {isRegistering 
                  ? "Create a new account to get started"
                  : "Sign in to access thousands of audiobooks"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loginMutation.isPending || registerMutation.isPending}
                  data-testid="button-submit-auth"
                >
                  {(loginMutation.isPending || registerMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isRegistering ? "Create Account" : "Sign In"}
                </Button>
              </form>
              
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setIsRegistering(!isRegistering)}
                  data-testid="button-toggle-auth-mode"
                >
                  {isRegistering 
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Create one"
                  }
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {providers?.facebook && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = "/api/auth/facebook"}
                    data-testid="button-facebook-auth"
                  >
                    <SiFacebook className="mr-2 h-4 w-4 text-blue-600" />
                    Facebook
                  </Button>
                )}
                
                {providers?.microsoft && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = "/api/auth/microsoft"}
                    data-testid="button-microsoft-auth"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" fill="none">
                      <rect x="1" y="1" width="10" height="10" fill="#F35325"/>
                      <rect x="12" y="1" width="10" height="10" fill="#81BC06"/>
                      <rect x="1" y="12" width="10" height="10" fill="#05A6F0"/>
                      <rect x="12" y="12" width="10" height="10" fill="#FFBA08"/>
                    </svg>
                    Microsoft
                  </Button>
                )}
                
                {providers?.auth0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = "/api/auth/auth0"}
                    data-testid="button-auth0-auth"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.98 7.448L19.62 0H4.347L2.02 7.448c-1.352 4.312.03 9.206 3.815 12.015L12.007 24l6.157-4.552c3.755-2.81 5.182-7.688 3.815-12z"/>
                    </svg>
                    Auth0
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MainApp() {
  const [currentView, setCurrentView] = useState<View>("library");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const { toggleHighContrast } = useAccessibility();
  const { currentBook, playBook, togglePlayPause, skip, changeSpeed } = useAudioContext();

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    playBook(book);
    setCurrentView("player");
  };

  const handleBackToLibrary = () => {
    setCurrentView("library");
  };
  
  const handleExpandPlayer = () => {
    if (currentBook) {
      setSelectedBook(currentBook);
      setCurrentView("player");
    }
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onHighContrast: toggleHighContrast,
    onPlayPause: togglePlayPause,
    onSkipBackward: () => skip(-15),
    onSkipForward: () => skip(15),
    onSpeedUp: () => changeSpeed(0.25),
    onSpeedDown: () => changeSpeed(-0.25),
  });

  const hasMiniPlayer = currentBook !== null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:no-underline"
      >
        Skip to main content
      </a>

      <AppLayout
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        hasCurrentBook={!!(selectedBook || currentBook)}
        header={<AppHeader />}
      >
        <main
          id="main-content"
          className={`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 ${hasMiniPlayer ? "pb-24" : ""}`}
        >
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
              <Player book={selectedBook || currentBook} onBackToLibrary={handleBackToLibrary} />
            </div>
          )}
        </main>
      </AppLayout>

      <MiniPlayer onExpand={handleExpandPlayer} />
    </div>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading AccessiBooks...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && (pathname === "/admin" || pathname === "/admin/storage")) {
    return (
      <TooltipProvider>
        <AdminStoragePage />
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <AudioProvider>
        {isAuthenticated ? <MainApp /> : <LandingPage />}
        <Toaster />
      </AudioProvider>
    </TooltipProvider>
  );
}

function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default AppWrapper;