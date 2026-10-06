const SPRINGER_API_BASE = process.env.SPRINGER_NATURE_API_BASE || "https://api.springernature.com";
const SPRINGER_API_KEY = process.env.SPRINGER_NATURE_API_KEY || "";
const SPRINGER_API_METRIC = process.env.SPRINGER_NATURE_API_METRIC || "";

export function isSpringerNatureConfigured() {
  return Boolean(SPRINGER_API_KEY);
}

export function springerNatureStatus() {
  return {
    configured: isSpringerNatureConfigured(),
    apiBase: SPRINGER_API_BASE,
    supports: ["meta_v2_json", "full_text_jats"],
    apiMetricConfigured: Boolean(SPRINGER_API_METRIC),
  };
}

function authValue() {
  if (!SPRINGER_API_KEY) {
    throw new Error("Springer Nature is not configured. Set SPRINGER_NATURE_API_KEY.");
  }
  return SPRINGER_API_METRIC
    ? SPRINGER_API_KEY + "/" + SPRINGER_API_METRIC
    : SPRINGER_API_KEY;
}

async function request(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const url = new URL(path, SPRINGER_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("api_key", authValue());

  const response = await fetch(url, {
    headers: {
      Accept: "application/json, application/xml;q=0.9",
      "User-Agent": "AccessiBooks-Hospitals/1.0",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      "Springer Nature request failed with HTTP " +
        response.status +
        (detail ? ": " + detail.slice(0, 400) : ""),
    );
  }
  return response;
}

export async function searchSpringerNatureMeta(input: {
  q: string;
  start?: number;
  pageSize?: number;
}) {
  if (!input.q.trim()) throw new Error("Springer Nature query is required");
  const response = await request("/meta/v2/json", {
    q: input.q.trim(),
    s: Math.max(input.start ?? 1, 1),
    p: Math.min(Math.max(input.pageSize ?? 20, 1), 100),
  });
  return response.json() as Promise<Record<string, unknown>>;
}

export async function getSpringerNatureMetaByDoi(doi: string) {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return searchSpringerNatureMeta({ q: "doi:" + clean, pageSize: 10 });
}

export async function getSpringerNatureFullTextJatsByDoi(doi: string) {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  const response = await request("/xmldata/jats", { q: "doi:" + clean });
  return response.text();
}
