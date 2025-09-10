import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  onPlayPause?: () => void;
  onSkipBackward?: () => void;
  onSkipForward?: () => void;
  onSpeedUp?: () => void;
  onSpeedDown?: () => void;
  onBookmark?: () => void;
  onHighContrast?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when user is typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
          event.preventDefault();
          handlers.onPlayPause?.();
          break;
        case "arrowleft":
          event.preventDefault();
          handlers.onSkipBackward?.();
          break;
        case "arrowright":
          event.preventDefault();
          handlers.onSkipForward?.();
          break;
        case "[":
          event.preventDefault();
          handlers.onSpeedDown?.();
          break;
        case "]":
          event.preventDefault();
          handlers.onSpeedUp?.();
          break;
        case "b":
          event.preventDefault();
          handlers.onBookmark?.();
          break;
        case "g":
          event.preventDefault();
          handlers.onHighContrast?.();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
