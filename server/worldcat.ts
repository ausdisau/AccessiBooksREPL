const WORLDCAT_API_BASE =
  process.env.OCLC_WORLDCAT_API_BASE || "https://americas.discovery.api.oclc.org";
const OCLC_TOKEN_URL = process.env.OCLC_TOKEN_URL || "https://oauth.oclc.org/token";

const OCLC_CLIENT_ID = process.env.OCLC_WORLDCAT_CLIENT_ID || "";
const OCLC_CLIENT_SECRET = process.env.OCLC_WORLDCAT_CLIENT_SECRET || "";
const OCLC_REGISTRY_ID = process.env.OCLC_WORLDCAT_REGISTRY_ID || "";

interface OclcTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string | number;
  scopes?: string;
  contextInstitutionId?: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export interface WorldCatBriefRecord {
  oclcNumber: string;
  title: string;
  creator: string;
  date?: string | null;
  language?: string | null;
  generalFormat?: string | null;
  specificFormat?: string | null;
  edition?: string | null;
  publisher?: string | null;
  publicationPlace?: string | null;
  isbns?: string[] | null;
  mergedOclcNumbers?: string[] | null;
  [key: string]: unknown;
}

export interface WorldCatBriefSearchResponse {
  numberOfRecords?: number;
  briefRecords?: WorldCatBriefRecord[];
  searchFacets?: unknown[];
}

export interface WorldCatIsbnLookup {
  isbn: string;
  records: WorldCatBriefRecord[];
}

export class WorldCatConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorldCatConfigurationError";
  }
}

export function isWorldCatConfigured(): boolean {
  return Boolean(OCLC_CLIENT_ID && OCLC_CLIENT_SECRET);
}

function normaliseIsbn(value: string): string {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function validateIsbn(value: string): string {
  const isbn = normaliseIsbn(value);
  if (!/^\d{9}[\dX]$/.test(isbn) && !/^\d{13}$/.test(isbn)) {
    throw new Error("ISBN must be a valid ISBN-10 or ISBN-13 value");
  }
  return isbn;
}

function tokenScope(): string {
  const scopes = ["wcapi:view_brief_bib"];
  if (OCLC_REGISTRY_ID) scopes.push(`context:${OCLC_REGISTRY_ID}`);
  return scopes.join(" ");
}

async function getAccessToken(): Promise<string> {
  if (!isWorldCatConfigured()) {
    throw new WorldCatConfigurationError(
      "WorldCat is not configured. Set OCLC_WORLDCAT_CLIENT_ID and OCLC_WORLDCAT_CLIENT_SECRET; optionally set OCLC_WORLDCAT_REGISTRY_ID.",
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${OCLC_CLIENT_ID}:${OCLC_CLIENT_SECRET}`).toString("base64");
  const url = new URL(OCLC_TOKEN_URL);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("scope", tokenScope());

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "User-Agent": "AccessiBooks-Hospitals/1.0",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OCLC OAuth token request failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const payload = (await response.json()) as OclcTokenResponse;
  const expiresIn = Number(payload.expires_in || 3600);
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  };
  return cachedToken.value;
}

async function worldCatGet<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(path, WORLDCAT_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "AccessiBooks-Hospitals/1.0",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `WorldCat request failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

export async function lookupWorldCatByIsbn(
  rawIsbn: string,
  options: { limit?: number; preferredLanguage?: string } = {},
): Promise<WorldCatIsbnLookup> {
  const isbn = validateIsbn(rawIsbn);
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);

  const payload = await worldCatGet<WorldCatBriefSearchResponse>(
    "/worldcat/search/v2/brief-bibs",
    {
      q: `bn:${isbn}`,
      limit,
      preferredLanguage: options.preferredLanguage ?? "eng",
    },
  );

  const records = (payload.briefRecords ?? []).filter((record) => {
    const identifiers = (record.isbns ?? []).map(normaliseIsbn);
    return identifiers.includes(isbn);
  });

  return {
    isbn,
    records: records.length ? records : payload.briefRecords ?? [],
  };
}

export async function getWorldCatBriefRecord(oclcNumber: string): Promise<WorldCatBriefRecord> {
  if (!/^\d+$/.test(oclcNumber)) throw new Error("Invalid OCLC number");

  return worldCatGet<WorldCatBriefRecord>(
    `/worldcat/search/v2/brief-bibs/${oclcNumber}`,
    {},
  );
}

export interface WorldCatHolding {
  oclcSymbol?: string;
  registryId?: string;
  institutionName?: string;
  country?: string;
  state?: string;
  hasOPACLink?: boolean;
  [key: string]: unknown;
}

export interface WorldCatHoldingsResponse {
  totalHoldingCount?: number;
  briefHoldings?: WorldCatHolding[];
  detailedHoldings?: WorldCatHolding[];
  [key: string]: unknown;
}

export async function lookupAustralianWorldCatHoldingsByIsbn(
  rawIsbn: string,
  options: { limit?: number } = {},
): Promise<WorldCatHoldingsResponse> {
  const isbn = validateIsbn(rawIsbn);
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);

  return worldCatGet<WorldCatHoldingsResponse>(
    "/worldcat/search/v2/bibs-holdings",
    {
      isbn,
      heldInCountry: "AU",
      limit,
    },
  );
}

export function worldCatStatus() {
  return {
    configured: isWorldCatConfigured(),
    apiBase: WORLDCAT_API_BASE,
    oauth: "client_credentials",
    scopes: ["wcapi:view_brief_bib"],
    registryContextConfigured: Boolean(OCLC_REGISTRY_ID),
  };
}
