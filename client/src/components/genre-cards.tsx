import { Book } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Wand2, 
  Heart, 
  Skull, 
  Rocket, 
  History, 
  GraduationCap,
  Music,
  Briefcase,
  Baby
} from "lucide-react";

interface GenreCardsProps {
  books: Book[];
  onGenreSelect: (genre: string) => void;
  selectedGenre: string | null;
}

const GENRE_CONFIGS: Record<string, { 
  icon: React.ElementType; 
  gradient: string;
  label: string;
}> = {
  "fiction": { 
    icon: BookOpen, 
    gradient: "from-blue-500 to-blue-700",
    label: "Fiction"
  },
  "fantasy": { 
    icon: Wand2, 
    gradient: "from-purple-500 to-purple-700",
    label: "Fantasy"
  },
  "romance": { 
    icon: Heart, 
    gradient: "from-pink-500 to-rose-600",
    label: "Romance"
  },
  "mystery": { 
    icon: Skull, 
    gradient: "from-slate-600 to-slate-800",
    label: "Mystery"
  },
  "science fiction": { 
    icon: Rocket, 
    gradient: "from-cyan-500 to-teal-600",
    label: "Sci-Fi"
  },
  "historical": { 
    icon: History, 
    gradient: "from-amber-600 to-orange-700",
    label: "Historical"
  },
  "non-fiction": { 
    icon: GraduationCap, 
    gradient: "from-green-500 to-emerald-600",
    label: "Non-Fiction"
  },
  "biography": { 
    icon: Briefcase, 
    gradient: "from-indigo-500 to-indigo-700",
    label: "Biography"
  },
  "poetry": { 
    icon: Music, 
    gradient: "from-rose-400 to-pink-600",
    label: "Poetry"
  },
  "children": { 
    icon: Baby, 
    gradient: "from-yellow-400 to-orange-500",
    label: "Children"
  },
};

export function GenreCards({ books, onGenreSelect, selectedGenre }: GenreCardsProps) {
  const genreCounts = books.reduce((acc, book) => {
    if (book.genre) {
      const normalizedGenre = book.genre.toLowerCase();
      for (const key of Object.keys(GENRE_CONFIGS)) {
        if (normalizedGenre.includes(key)) {
          acc[key] = (acc[key] || 0) + 1;
          break;
        }
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const availableGenres = Object.entries(GENRE_CONFIGS)
    .filter(([key]) => genreCounts[key] && genreCounts[key] > 0)
    .sort((a, b) => (genreCounts[b[0]] || 0) - (genreCounts[a[0]] || 0));

  if (availableGenres.length === 0) {
    return null;
  }

  const handleGenreKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <section className="mb-8" aria-label="Browse by Genre">
      <h2 className="font-display text-xl font-semibold mb-4">Browse by Genre</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-4">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Show all genres, ${books.length} books`}
            aria-pressed={selectedGenre === null}
            className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-xl"
            onClick={() => onGenreSelect("")}
            onKeyDown={(e) => handleGenreKeyDown(e, () => onGenreSelect(""))}
          >
            <Card
              className={`w-32 cursor-pointer transition-all rounded-xl overflow-hidden border-2 ${
                selectedGenre === null ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
              }`}
            >
              <CardContent className="p-0">
                <div className="h-20 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-sm font-medium">All</p>
                  <p className="text-xs text-muted-foreground">{books.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          {availableGenres.map(([key, config]) => {
            const Icon = config.icon;
            const count = genreCounts[key] || 0;
            const isSelected = selectedGenre?.toLowerCase() === key;
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`Filter by ${config.label}, ${count} books`}
                aria-pressed={isSelected}
                className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-xl"
                onClick={() => onGenreSelect(key)}
                onKeyDown={(e) => handleGenreKeyDown(e, () => onGenreSelect(key))}
              >
                <Card
                  className={`w-32 cursor-pointer transition-all rounded-xl overflow-hidden border-2 ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                  }`}
                >
                  <CardContent className="p-0">
                    <div className={`h-20 bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="p-2.5 text-center">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{count}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
