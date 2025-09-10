import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Contrast, Type, Moon } from "lucide-react";

export function AccessibilityControls() {
  const { settings, toggleHighContrast, toggleDyslexiaFont, toggleDarkMode } = useAccessibility();

  return (
    <div className="flex items-center space-x-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleHighContrast}
        aria-label={`${settings.highContrast ? "Disable" : "Enable"} high contrast mode`}
        data-testid="button-high-contrast"
      >
        <Contrast className="h-4 w-4 mr-2" aria-hidden="true" />
        High Contrast
      </Button>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleDyslexiaFont}
        aria-label={`${settings.dyslexiaFont ? "Disable" : "Enable"} dyslexia-friendly font`}
        data-testid="button-dyslexia-font"
      >
        <Type className="h-4 w-4 mr-2" aria-hidden="true" />
        Dyslexia Font
      </Button>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleDarkMode}
        aria-label={`${settings.darkMode ? "Disable" : "Enable"} dark mode`}
        data-testid="button-dark-mode"
      >
        <Moon className="h-4 w-4 mr-2" aria-hidden="true" />
        Dark Mode
      </Button>
    </div>
  );
}
