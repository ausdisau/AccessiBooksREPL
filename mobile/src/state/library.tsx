import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Book } from '@/domain/types';

const STORAGE_KEY = 'accessibooks.local-library.v1';

interface LibraryContextValue {
  books: Book[];
  hydrated: boolean;
  isSaved: (id: string) => boolean;
  save: (book: Book) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: React.PropsWithChildren) {
  const [books, setBooks] = useState<Book[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setBooks(parsed as Book[]);
        } catch {
          setBooks([]);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback(async (next: Book[]) => {
    setBooks(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const save = useCallback(async (book: Book) => {
    const next = [book, ...books.filter((item) => item.id !== book.id)];
    await persist(next);
  }, [books, persist]);

  const remove = useCallback(async (id: string) => {
    await persist(books.filter((item) => item.id !== id));
  }, [books, persist]);

  const isSaved = useCallback((id: string) => books.some((item) => item.id === id), [books]);

  const value = useMemo(
    () => ({ books, hydrated, isSaved, save, remove }),
    [books, hydrated, isSaved, remove, save],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}
