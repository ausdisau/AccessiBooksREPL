const WOS_STARTER_BASE =
  process.env.WOS_STARTER_BASE_URL || "https://api.clarivate.com/apis/wos-starter/v1";
const WOS_STARTER_KEY = process.env.WOS_STARTER_API_KEY || "";
const WOS_JOURNALS_BASE =
  process.env.WOS_JOURNALS_BASE_URL || "https://api.clarivate.com/apis/wos-journals/v1";
const WOS_JOURNALS_KEY = process.env.WOS_JOURNALS_API_KEY || "";

async function getJson<T>(
  base: string,
  path: string,
  key: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  if (!key) throw new Error("Web of Science API key is not configured");
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-ApiKey": key,
      "User-Agent": "AccessiBooks-Hospitals/1.0",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      "Web of Science request failed with HTTP " +
        response.status +
        (text ? ": " + text.slice(0, 400) : ""),
    );
  }
  return JSON.parse(text) as T;
}

export function webOfScienceStatus() {
  return {
    starterConfigured: Boolean(WOS_STARTER_KEY),
    journalsConfigured: Boolean(WOS_JOURNALS_KEY),
    starterBase: WOS_STARTER_BASE,
    journalsBase: WOS_JOURNALS_BASE,
  };
}

export function searchWebOfScienceDocuments(input: {
  q: string;
  db?: string;
  limit?: number;
  page?: number;
  detail?: "short" | "full";
}) {
  if (!input.q.trim()) throw new Error("Web of Science query is required");
  return getJson<Record<string, unknown>>(
    WOS_STARTER_BASE,
    "documents",
    WOS_STARTER_KEY,
    {
      q: input.q.trim(),
      db: input.db ?? "WOS",
      limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
      page: Math.max(input.page ?? 1, 1),
      detail: input.detail ?? "full",
    },
  );
}

export function getWebOfScienceDocument(
  uid: string,
  detail: "short" | "full" = "full",
) {
  return getJson<Record<string, unknown>>(
    WOS_STARTER_BASE,
    "documents/" + encodeURIComponent(uid),
    WOS_STARTER_KEY,
    { detail },
  );
}

export function getWebOfScienceJournalByIssn(issn: string) {
  return getJson<Record<string, unknown>>(
    WOS_STARTER_BASE,
    "journals",
    WOS_STARTER_KEY,
    { issn },
  );
}

export function getWebOfScienceJournalReport(
  journalId: string,
  jcrYear: number,
) {
  if (!WOS_JOURNALS_KEY) {
    throw new Error("Web of Science Journals API key is not configured");
  }
  return getJson<Record<string, unknown>>(
    WOS_JOURNALS_BASE,
    "journals/" +
      encodeURIComponent(journalId) +
      "/reports/year/" +
      String(jcrYear),
    WOS_JOURNALS_KEY,
    {},
  );
}
