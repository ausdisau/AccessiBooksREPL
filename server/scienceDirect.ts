const ELSEVIER_API_BASE =
  process.env.ELSEVIER_API_BASE || "https://api.elsevier.com";
const ELSEVIER_API_KEY = process.env.ELSEVIER_API_KEY || "";
const ELSEVIER_INST_TOKEN = process.env.ELSEVIER_INST_TOKEN || "";

export function isScienceDirectConfigured() {
  return Boolean(ELSEVIER_API_KEY);
}

export function scienceDirectStatus() {
  return {
    configured: isScienceDirectConfigured(),
    apiBase: ELSEVIER_API_BASE,
    institutionTokenConfigured: Boolean(ELSEVIER_INST_TOKEN),
  };
}

function headers(
  accept = "application/json",
  userToken?: string,
): HeadersInit {
  if (!ELSEVIER_API_KEY) {
    throw new Error("Elsevier is not configured. Set ELSEVIER_API_KEY.");
  }
  return {
    Accept: accept,
    "X-ELS-APIKey": ELSEVIER_API_KEY,
    ...(ELSEVIER_INST_TOKEN
      ? { "X-ELS-Insttoken": ELSEVIER_INST_TOKEN }
      : {}),
    ...(userToken ? { Authorization: "Bearer " + userToken } : {}),
    "User-Agent": "AccessiBooks-Hospitals/1.0",
  };
}

export async function getScienceDirectArticleByDoi(input: {
  doi: string;
  view?: "META" | "META_ABS" | "FULL";
  accept?: "application/json" | "text/xml" | "text/plain";
  userToken?: string;
}) {
  const doi = input.doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  const url = new URL(
    "/content/article/doi/" + encodeURIComponent(doi),
    ELSEVIER_API_BASE,
  );
  if (input.view) url.searchParams.set("view", input.view);

  const accept = input.accept ?? "application/json";
  const response = await fetch(url, {
    headers: headers(accept, input.userToken),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      "ScienceDirect article retrieval failed with HTTP " +
        response.status +
        (text ? ": " + text.slice(0, 500) : ""),
    );
  }

  return accept === "application/json"
    ? (JSON.parse(text) as Record<string, unknown>)
    : text;
}

export async function searchScienceDirect(input: {
  query: string;
  count?: number;
  start?: number;
  userToken?: string;
}) {
  if (!input.query.trim()) {
    throw new Error("ScienceDirect query is required");
  }

  const url = new URL("/content/search/sciencedirect", ELSEVIER_API_BASE);
  url.searchParams.set("query", input.query.trim());
  url.searchParams.set(
    "count",
    String(Math.min(Math.max(input.count ?? 25, 1), 200)),
  );
  url.searchParams.set("start", String(Math.max(input.start ?? 0, 0)));

  const response = await fetch(url, {
    headers: headers("application/json", input.userToken),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      "ScienceDirect search failed with HTTP " +
        response.status +
        (text ? ": " + text.slice(0, 500) : ""),
    );
  }
  return JSON.parse(text) as Record<string, unknown>;
}
