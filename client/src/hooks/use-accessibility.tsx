import { useState, useEffect } from "react";
import { localStorageService, AccessibilitySettings } from "@/lib/storage";

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => 
    localStorageService.getSettings()
  );

  useEffect(() => {
    // Apply settings to document
    document.documentElement.classList.toggle("high-contrast", settings.highContrast);
    document.documentElement.classList.toggle("dyslexia-font", settings.dyslexiaFont);
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  const toggleHighContrast = () => {
    const newSettings = { ...settings, highContrast: !settings.highContrast };
    setSettings(newSettings);
    localStorageService.saveSettings(newSettings);
  };

  const toggleDyslexiaFont = () => {
    const newSettings = { ...settings, dyslexiaFont: !settings.dyslexiaFont };
    setSettings(newSettings);
    localStorageService.saveSettings(newSettings);
  };

  const toggleDarkMode = () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSettings(newSettings);
    localStorageService.saveSettings(newSettings);
  };

  return {
    settings,
    toggleHighContrast,
    toggleDyslexiaFont,
    toggleDarkMode,
  };
}
