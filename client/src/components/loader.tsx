import { AccessiBooksLogo } from "@/components/accessibooks-logo";
import { cn } from "@/lib/utils";

export type LoaderVariant = "page" | "inline" | "spinner";

interface LoaderProps {
  variant?: LoaderVariant;
  message?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Accessible loader. Animations respect prefers-reduced-motion and .reduce-motion.
 */
export function Loader({
  variant = "page",
  message,
  className,
  "data-testid": dataTestId = "loader",
}: LoaderProps) {
  const label = message ?? (variant === "page" ? "Loading AccessiBooks" : "Loading");
  const liveMessage = message ?? "Loading…";

  if (variant === "spinner") {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label={label}
        className={cn("inline-flex items-center justify-center", className)}
        data-testid={dataTestId}
      >
        <span className="sr-only">{liveMessage}</span>
        <span
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-hidden
        />
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("flex items-center gap-2", className)}
        data-testid={dataTestId}
      >
        <span className="sr-only">{liveMessage}</span>
        <span
          className="flex gap-1"
          aria-hidden
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-loader-dots"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
        {message && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
    );
  }

  // page: full-screen centered with animated illustration
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center bg-background gap-6 px-4",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid={dataTestId}
    >
      <p className="sr-only">{liveMessage}</p>
      {/* Animated headphones + book graphic (respects prefers-reduced-motion via global CSS) */}
      <div className="animate-breathe mb-2" aria-hidden>
        <svg
          viewBox="0 0 80 56"
          className="h-16 w-20 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M 24 28 Q 24 12 40 12 Q 56 12 56 28 L 56 36 Q 56 44 44 46 L 44 52 Q 44 54 40 54 Q 36 54 36 52 L 36 46 Q 24 44 24 36 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" />
          <ellipse cx="28" cy="28" rx="10" ry="12" className="fill-background" strokeWidth="2.5" />
          <ellipse cx="52" cy="28" rx="10" ry="12" className="fill-background" strokeWidth="2.5" />
          <circle cx="28" cy="28" r="3" className="fill-accent" />
          <circle cx="52" cy="28" r="3" className="fill-accent" />
          <rect x="8" y="38" width="14" height="4" rx="1" className="fill-primary/80" />
          <rect x="10" y="34" width="14" height="4" rx="1" className="fill-primary" />
          <rect x="12" y="30" width="14" height="4" rx="1" className="fill-primary" />
        </svg>
      </div>
      <div className="animate-loader-pulse" aria-hidden>
        <AccessiBooksLogo showText />
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-accent animate-loader-dots"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
      {message && (
        <p className="font-display text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
