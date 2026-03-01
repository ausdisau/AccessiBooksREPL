import { Button } from "@/components/ui/button";
import { AnimatedHeroIllustration } from "@/components/animated-hero-illustration";
import { motion } from "framer-motion";
import { BookOpen, Grid3x3 } from "lucide-react";

interface HeroSectionProps {
  onBrowseCatalog: () => void;
  onExploreSubjects: () => void;
  /** When true, decorative animations are disabled (accessibility). */
  reduceMotion?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection({ onBrowseCatalog, onExploreSubjects, reduceMotion }: HeroSectionProps) {
  return (
    <section className="relative py-14 md:py-20 lg:py-24 text-center overflow-hidden" aria-label="Welcome">
      {/* Subtle animated gradient blobs (respect reduced-motion via global CSS) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/8 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-float-slow" style={{ animationDelay: "1s" }} />
      </div>
      <motion.div
        className="relative z-10 flex flex-col items-center"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={item} className="mb-6 w-full flex justify-center">
          <AnimatedHeroIllustration reduceMotion={reduceMotion} className="h-32 md:h-40" />
        </motion.div>
        <motion.p
          variants={item}
          className="font-display text-sm uppercase tracking-widest text-accent mb-3"
        >
          Accessible listening for everyone
        </motion.p>
        <motion.h1
          variants={item}
          className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 max-w-2xl mx-auto leading-tight"
        >
          Borrow audiobooks and ebooks, made for you.
        </motion.h1>
        <motion.p
          variants={item}
          className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-10"
        >
          High contrast, dyslexia-friendly options, and full keyboard support.
        </motion.p>
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center"
        >
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
        </motion.div>
      </motion.div>
    </section>
  );
}
