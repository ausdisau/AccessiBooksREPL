import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

const AUTH_QUERY_KEY = ["/api/auth/user"] as const;
const AUTH_FETCH_MS = 8000;

async function fetchUser(): Promise<User | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_FETCH_MS);
  try {
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      signal: controller.signal,
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchUser,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
