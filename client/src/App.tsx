import { useState } from "react";
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
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Book as BookIcon, Play, LogOut, User, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type View = "library" | "player";

// Header component with user management
function AppHeader() {
  const { user } = useAuth();
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <AccessiBooksLogo />

          <div className="flex items-center space-x-4">
            <AccessibilityControls />
            
            {user && (
              <div className="flex items-center space-x-2 pl-4 border-l border-border">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-username">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email || "User"
                    }
                  </span>
                </div>
                
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

// Landing page for logged-out users
function LandingPage() {
  const { toggleHighContrast } = useAccessibility();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      registerMutation.mutate(formData);
    } else {
      loginMutation.mutate({ email: formData.email, password: formData.password });
    }
  };
  
  useKeyboardShortcuts({
    onHighContrast: toggleHighContrast,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <AccessiBooksLogo />
          <AccessibilityControls />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-primary">
                Welcome to AccessiBooks
              </h1>
              <p className="text-xl text-muted-foreground">
                Your accessible audiobook library with features designed for everyone
              </p>
              
              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Audiobooks from iTunes, Spotify, LibriVox, and more</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>High contrast mode and dyslexia-friendly fonts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Comprehensive keyboard shortcuts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Smart bookmarking and progress tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Screen reader optimized interface</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
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
                {/* Email/Password Form */}
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
                
                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Replit Auth (Google, GitHub, Apple, X, email) */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="button-replit-auth"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                    </svg>
                    Replit
                  </Button>
                  
                  {/* Facebook */}
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
                  
                  {/* Microsoft */}
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
                  
                  {/* Auth0 */}
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
                
                {/* Info about Replit Auth providers */}
                <p className="text-xs text-center text-muted-foreground">
                  Replit Auth supports Google, GitHub, Apple, X (Twitter), and email login
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
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
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <TooltipProvider>
      {isAuthenticated ? <MainApp /> : <LandingPage />}
      <Toaster />
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