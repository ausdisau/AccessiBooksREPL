const NEWS_API_BASE =
  process.env.NEWS_API_BASE || "https://newsapi.org";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

export function isNewsApiConfigured() {
  return Boolean(NEWS_API_KEY);
}

export function newsApiStatus() {
  return {
    configured: isNewsApiConfigured(),
    apiBase: NEWS_API_BASE,
    fullArticleContent: false,
  };
}

async function getJson(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  if (!NEWS_API_KEY) {
    throw new Error("News API is not configured. Set NEWS_API_KEY.");
  }

  const url = new URL(path, NEWS_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": NEWS_API_KEY,
      "User-Agent": "AccessiBooks-Hospitals/1.0",
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      "News API request failed with HTTP " +
        response.status +
        (text ? ": " + text.slice(0, 400) : ""),
    );
  }
  return JSON.parse(text) as Record<string, unknown>;
}

export function searchNewsApi(input: {
  q: string;
  from?: string;
  to?: string;
  language?: string;
  sortBy?: "relevancy" | "popularity" | "publishedAt";
  pageSize?: number;
  page?: number;
  domains?: string;
}) {
  if (!input.q.trim()) throw new Error("News API query is required");

  return getJson("/v2/everything", {
    q: input.q.trim(),
    from: input.from,
    to: input.to,
    language: input.language ?? "en",
    sortBy: input.sortBy ?? "publishedAt",
    pageSize: Math.min(Math.max(input.pageSize ?? 20, 1), 100),
    page: Math.max(input.page ?? 1, 1),
    domains: input.domains,
  });
}

export function getNewsApiSources(
  input: {
    country?: string;
    category?: string;
    language?: string;
  } = {},
) {
  return getJson("/v2/top-headlines/sources", {
    country: input.country,
    category: input.category,
    language: input.language,
  });
}
