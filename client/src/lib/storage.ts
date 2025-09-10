import { Bookmark, Progress } from "@shared/schema";

const BOOKMARKS_KEY = "accessibooks_bookmarks";
const PROGRESS_KEY = "accessibooks_progress";
const SETTINGS_KEY = "accessibooks_settings";

export interface AccessibilitySettings {
  highContrast: boolean;
  dyslexiaFont: boolean;
  darkMode: boolean;
}

export const localStorageService = {
  // Bookmarks
  getBookmarks(bookId: string): Bookmark[] {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (!stored) return [];
      
      const allBookmarks: Bookmark[] = JSON.parse(stored);
      return allBookmarks.filter(bookmark => bookmark.bookId === bookId);
    } catch {
      return [];
    }
  },

  addBookmark(bookmark: Bookmark): void {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      const bookmarks: Bookmark[] = stored ? JSON.parse(stored) : [];
      
      bookmarks.push(bookmark);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error("Failed to save bookmark:", error);
    }
  },

  removeBookmark(bookmarkId: string): void {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (!stored) return;
      
      const bookmarks: Bookmark[] = JSON.parse(stored);
      const filtered = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
    }
  },

  // Progress
  getProgress(bookId: string): Progress | null {
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      if (!stored) return null;
      
      const allProgress: Progress[] = JSON.parse(stored);
      return allProgress.find(progress => progress.bookId === bookId) || null;
    } catch {
      return null;
    }
  },

  saveProgress(progress: Progress): void {
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      const allProgress: Progress[] = stored ? JSON.parse(stored) : [];
      
      const existingIndex = allProgress.findIndex(p => p.bookId === progress.bookId);
      if (existingIndex >= 0) {
        allProgress[existingIndex] = progress;
      } else {
        allProgress.push(progress);
      }
      
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  },

  // Settings
  getSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        return { highContrast: false, dyslexiaFont: false, darkMode: false };
      }
      
      return JSON.parse(stored);
    } catch {
      return { highContrast: false, dyslexiaFont: false, darkMode: false };
    }
  },

  saveSettings(settings: AccessibilitySettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },
};
