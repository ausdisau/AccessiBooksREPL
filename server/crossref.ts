const CROSSREF_API_BASE =
  process.env.CROSSREF_API_BASE || "https://api.crossref.org";
const CROSSREF_MAILTO = process.env.CROSSREF_MAILTO || "";
const CROSSREF_PLUS_TOKEN = process.env.CROSSREF_PLUS_TOKEN || "";

export interface CrossrefWork {
  DOI: string;
  title?: string[];
  subtitle?: string[];
  abstract?: string;
  author?: Array<{ given?: string; family?: string; name?: string; ORCID?: string }>;
  publisher?: string;
  "container-title"?: string[];
  type?: string;
  ISSN?: string[];
  ISBN?: string[];
  URL?: string;
  published?: { "date-parts"?: number[][] };
  issued?: { "date-parts"?: number[][] };
  license?: Array<{ URL?: string; start?: { "date-parts"?: number[][] }; delay_in_days?: number }>;
  link?: Array<{ URL?: string; "content-type"?: string; "content-version"?: string; "intended-application"?: string }>;
  "is-referenced-by-count"?: number;
  [key: string]: unknown;
}

function headers(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": `AccessiBooks-Hospitals/1.0${CROSSREF_MAILTO ? ` (mailto:${CROSSREF_MAILTO})` : ""}`,
    ...(CROSSREF_PLUS_TOKEN
      ? { "Crossref-Plus-API-Token": `Bearer ${CROSSREF_PLUS_TOKEN}` }
      : {}),
  };
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(path, CROSSREF_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  if (CROSSREF_MAILTO) url.searchParams.set("mailto", CROSSREF_MAILTO);

  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Crossref request failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 400)}` : ""}`);
  }
  return (await response.json()) as T;
}

export function crossrefStatus() {
  return {
    configured: true,
    apiBase: CROSSREF_API_BASE,
    access: CROSSREF_PLUS_TOKEN ? "metadata_plus" : CROSSREF_MAILTO ? "polite" : "public",
    registrationRequired: false,
  };
}

export async function getCrossrefWork(doi: string): Promise<CrossrefWork> {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (!clean.includes("/")) throw new Error("A DOI is required");
  const payload = await getJson<{ message: CrossrefWork }>(
    `/works/${encodeURIComponent(clean)}`,
  );
  return payload.message;
}

export async function searchCrossrefWorks(input: {
  query?: string;
  title?: string;
  author?: string;
  rows?: number;
  offset?: number;
  fromPublishedDate?: string;
  untilPublishedDate?: string;
}) {
  const filters = [
    input.fromPublishedDate ? `from-pub-date:${input.fromPublishedDate}` : "",
    input.untilPublishedDate ? `until-pub-date:${input.untilPublishedDate}` : "",
  ].filter(Boolean).join(",");

  return getJson<Record<string, unknown>>("/works", {
    query: input.query,
    "query.title": input.title,
    "query.author": input.author,
    rows: Math.min(Math.max(input.rows ?? 20, 1), 1000),
    offset: Math.max(input.offset ?? 0, 0),
    filter: filters || undefined,
  });
}
