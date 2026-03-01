import { cn } from "@/lib/utils";

interface AnimatedHeroIllustrationProps {
  className?: string;
  /** When true, animations are disabled (e.g. prefers-reduced-motion). */
  reduceMotion?: boolean;
}

/**
 * Animated SVG illustration: stacked books + headphones for the hero section.
 * Uses CSS animations that are neutralized by prefers-reduced-motion / .reduce-motion.
 */
export function AnimatedHeroIllustration({ className, reduceMotion }: AnimatedHeroIllustrationProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      aria-hidden
    >
      <svg
        viewBox="0 0 280 200"
        className="h-full w-full max-h-[200px] max-w-[280px] text-primary"
        fill="none"
      >
        {/* Decorative floating shapes (subtle circles) */}
        <circle
          cx="50"
          cy="100"
          r="24"
          className={cn("fill-primary/10", !reduceMotion && "animate-float-slow")}
          style={reduceMotion ? undefined : { animationDelay: "0s" }}
        />
        <circle
          cx="230"
          cy="90"
          r="20"
          className={cn("fill-accent/15", !reduceMotion && "animate-float-slow")}
          style={reduceMotion ? undefined : { animationDelay: "0.8s" }}
        />
        <circle
          cx="140"
          cy="170"
          r="16"
          className={cn("fill-primary/10", !reduceMotion && "animate-float-slow")}
          style={reduceMotion ? undefined : { animationDelay: "0.4s" }}
        />

        {/* Stacked books (left) */}
        <g className={cn(!reduceMotion && "animate-float")} style={{ transformOrigin: "80px 140px" }}>
          <rect x="40" y="110" width="52" height="8" rx="2" className="fill-primary/90" />
          <rect x="44" y="100" width="52" height="8" rx="2" className="fill-primary" />
          <rect x="48" y="90" width="52" height="8" rx="2" className="fill-primary" />
          <rect x="52" y="80" width="52" height="8" rx="2" className="fill-accent/90" />
          <line x1="56" y1="84" x2="96" y2="84" stroke="currentColor" strokeWidth="0.8" className="text-primary opacity-40" />
          <line x1="56" y1="94" x2="92" y2="94" stroke="currentColor" strokeWidth="0.8" className="text-primary opacity-40" />
        </g>

        {/* Headphones (center) - main focal point */}
        <g className={cn(!reduceMotion && "animate-breathe")} style={{ transformOrigin: "140px 100px" }}>
          <path
            d="M 85 95 Q 85 65 140 65 Q 195 65 195 95 L 195 115 Q 195 135 170 138 L 170 145 Q 170 155 140 155 Q 110 155 110 145 L 110 138 Q 85 135 85 115 Z"
            className="fill-primary stroke-primary/80"
            strokeWidth="3"
          />
          <ellipse cx="95" cy="100" rx="18" ry="22" className="fill-background stroke-primary" strokeWidth="4" />
          <ellipse cx="185" cy="100" rx="18" ry="22" className="fill-background stroke-primary" strokeWidth="4" />
          <circle cx="95" cy="100" r="6" className="fill-accent" />
          <circle cx="185" cy="100" r="6" className="fill-accent" />
        </g>

        {/* Book with pages open (right) */}
        <g className={cn(!reduceMotion && "animate-float")} style={{ transformOrigin: "220px 130px", animationDelay: "0.3s" }}>
          <path
            d="M 165 85 L 220 85 L 220 175 L 165 175 Q 165 130 165 85 Z"
            className="fill-primary/95"
          />
          <path
            d="M 220 85 L 275 85 L 275 175 L 220 175 Q 220 130 220 85 Z"
            className="fill-primary/80"
          />
          <line x1="192" y1="95" x2="258" y2="95" stroke="currentColor" strokeWidth="0.6" className="text-primary opacity-30" />
          <line x1="192" y1="105" x2="255" y2="105" stroke="currentColor" strokeWidth="0.6" className="text-primary opacity-30" />
          <line x1="192" y1="115" x2="250" y2="115" stroke="currentColor" strokeWidth="0.6" className="text-primary opacity-30" />
        </g>

        {/* Small sound waves (decorative) */}
        <path
          d="M 70 55 Q 85 50 100 55"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className={cn("text-accent/60", !reduceMotion && "animate-pulse")}
          style={{ opacity: 0.7 }}
        />
        <path
          d="M 180 55 Q 195 50 210 55"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className={cn("text-accent/60", !reduceMotion && "animate-pulse")}
          style={{ opacity: 0.7, animationDelay: "0.5s" }}
        />
      </svg>
    </div>
  );
}
