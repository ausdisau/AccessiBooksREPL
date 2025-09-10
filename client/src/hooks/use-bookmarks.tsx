import { useState, useEffect } from "react";
import { Bookmark } from "@shared/schema";
import { localStorageService } from "@/lib/storage";

export function useBookmarks(bookId: string) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (bookId) {
      const stored = localStorageService.getBookmarks(bookId);
      setBookmarks(stored);
    }
  }, [bookId]);

  const addBookmark = (name: string, time: number) => {
    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      bookId,
      name,
      time,
      createdAt: new Date().toISOString(),
    };

    localStorageService.addBookmark(bookmark);
    setBookmarks(prev => [...prev, bookmark]);
  };

  const removeBookmark = (bookmarkId: string) => {
    localStorageService.removeBookmark(bookmarkId);
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
  };
}
