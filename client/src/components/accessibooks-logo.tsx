interface AccessiBooksLogoProps {
  className?: string;
  showText?: boolean;
  /** When false, logo text is not an h1 (e.g. on landing so hero can be the only h1). Default true. */
  asHeading?: boolean;
}

export function AccessiBooksLogo({ className = "", showText = true, asHeading = true }: AccessiBooksLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo Icon */}
      <div className="mr-3">
        <svg
          viewBox="0 0 120 100"
          className="h-12 w-12"
          aria-hidden="true"
        >
          {/* Monitor Base */}
          <rect
            x="50"
            y="75"
            width="20"
            height="8"
            rx="2"
            fill="currentColor"
            className="text-primary"
          />
          
          {/* Monitor Stand */}
          <rect
            x="55"
            y="70"
            width="10"
            height="10"
            rx="1"
            fill="currentColor"
            className="text-primary"
          />
          
          {/* Monitor Frame (Outer) */}
          <rect
            x="15"
            y="10"
            width="90"
            height="65"
            rx="8"
            fill="currentColor"
            className="text-primary"
            strokeWidth="2"
          />
          
          {/* Monitor Screen (Inner) */}
          <rect
            x="22"
            y="17"
            width="76"
            height="51"
            rx="4"
            className="fill-secondary"
          />
          
          {/* Book Pages */}
          <path
            d="M 35 25 Q 35 23 37 23 L 58 23 Q 60 23 60 25 L 60 55 Q 60 57 58 57 L 37 57 Q 35 57 35 55 Z"
            className="fill-accent"
          />
          <path
            d="M 60 25 Q 60 23 62 23 L 83 23 Q 85 23 85 25 L 85 55 Q 85 57 83 57 L 62 57 Q 60 57 60 55 Z"
            className="fill-accent"
          />
          
          {/* Book Spine */}
          <rect
            x="58"
            y="23"
            width="4"
            height="34"
            rx="1"
            fill="currentColor"
            className="text-primary"
          />
          
          {/* Page Lines (Left Page) */}
          <line x1="40" y1="30" x2="54" y2="30" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          <line x1="40" y1="34" x2="54" y2="34" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          <line x1="40" y1="38" x2="54" y2="38" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          <line x1="40" y1="42" x2="50" y2="42" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          
          {/* Page Lines (Right Page) */}
          <line x1="66" y1="30" x2="80" y2="30" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          <line x1="66" y1="34" x2="80" y2="34" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          <line x1="66" y1="38" x2="80" y2="38" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
          <line x1="66" y1="42" x2="76" y2="42" stroke="currentColor" strokeWidth="0.5" className="text-primary opacity-30" />
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          {asHeading ? (
            <h1 className="font-display text-2xl font-bold text-primary leading-tight">
              AccessiBooks
            </h1>
          ) : (
            <span className="font-display text-2xl font-bold text-primary leading-tight">
              AccessiBooks
            </span>
          )}
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">
            Online Library
          </p>
        </div>
      )}
    </div>
  );
}