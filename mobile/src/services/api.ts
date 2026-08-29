import type { Book } from '@/domain/types';

function apiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configured) {
    throw new Error('AccessiBooks API is not configured. Set EXPO_PUBLIC_API_BASE_URL.');
  }
  return configured.replace(/\/$/, '');
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep status-based fallback when a proxy returns non-JSON content.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const accessiBooksApi = {
  listBooks(): Promise<Book[]> {
    return request<Book[]>('/api/books');
  },

  searchBooks(query: string): Promise<Book[]> {
    return request<Book[]>(`/api/books/search?q=${encodeURIComponent(query)}`);
  },

  getBook(id: string): Promise<Book> {
    return request<Book>(`/api/books/${encodeURIComponent(id)}`);
  },

  streamUrl(id: string): string {
    return `${apiBase()}/api/stream/${encodeURIComponent(id)}`;
  },
};
