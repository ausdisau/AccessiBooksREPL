import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Contrast, Type, Moon, Move } from "lucide-react";

export function AccessibilityControls() {
  const { settings, toggleHighContrast, toggleDyslexiaFont, toggleDarkMode, toggleReducedMotion } = useAccessibility();

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Accessibility options">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleHighContrast}
        className="rounded-lg h-9"
        aria-label={`${settings.highContrast ? "Disable" : "Enable"} high contrast`}
        data-testid="button-high-contrast"
        title="High contrast"
      >
        <Contrast className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDyslexiaFont}
        className="rounded-lg h-9"
        aria-label={`${settings.dyslexiaFont ? "Disable" : "Enable"} dyslexia-friendly font`}
        data-testid="button-dyslexia-font"
        title="Dyslexia font"
      >
        <Type className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDarkMode}
        className="rounded-lg h-9"
        aria-label={`${settings.darkMode ? "Disable" : "Enable"} dark mode`}
        data-testid="button-dark-mode"
        title="Dark mode"
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleReducedMotion}
        className="rounded-lg h-9"
        aria-label={`${settings.reducedMotion ? "Disable" : "Enable"} reduced motion`}
        data-testid="button-reduced-motion"
        title="Reduced motion"
      >
        <Move className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
