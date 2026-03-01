import { Button } from "@/components/ui/button";
import { BookOpen, Grid3x3 } from "lucide-react";

interface HeroSectionProps {
  onBrowseCatalog: () => void;
  onExploreSubjects: () => void;
}

export function HeroSection({ onBrowseCatalog, onExploreSubjects }: HeroSectionProps) {
  return (
    <section className="py-14 md:py-20 lg:py-24 text-center" aria-label="Welcome">
      <p className="font-display text-sm uppercase tracking-widest text-accent mb-3">
        Accessible listening for everyone
      </p>
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 max-w-2xl mx-auto leading-tight">
        Borrow audiobooks and ebooks, made for you.
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-10">
        High contrast, dyslexia-friendly options, and full keyboard support.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Button
          size="lg"
          onClick={onBrowseCatalog}
          className="font-display text-base px-8 py-6 rounded-xl bg-primary hover:bg-primary/90 shadow-md"
          data-testid="button-browse-catalog"
        >
          <BookOpen className="h-5 w-5 mr-2" aria-hidden="true" />
          Browse catalog
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onExploreSubjects}
          className="font-display text-base px-8 py-6 rounded-xl border-2"
          data-testid="button-explore-subjects"
        >
          <Grid3x3 className="h-5 w-5 mr-2" aria-hidden="true" />
          Explore subjects
        </Button>
      </div>
    </section>
  );
}
