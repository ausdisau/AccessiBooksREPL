const EBSCO_EDS_BASE_URL =
  process.env.EBSCO_EDS_BASE_URL || "https://eds-api.ebscohost.com";
const EBSCO_EDS_USER_ID = process.env.EBSCO_EDS_USER_ID || "";
const EBSCO_EDS_PASSWORD = process.env.EBSCO_EDS_PASSWORD || "";
const EBSCO_EDS_INTERFACE_ID = process.env.EBSCO_EDS_INTERFACE_ID || "wsapi";
const EBSCO_EDS_PROFILE = process.env.EBSCO_EDS_PROFILE || "";
const EBSCO_EDS_ORG = process.env.EBSCO_EDS_ORG || "AccessiBooks Hospitals";
const EBSCO_EDS_API_KEY = process.env.EBSCO_EDS_API_KEY || "";

interface AuthResponse {
  AuthToken: string;
  AuthTimeout?: number | string;
  [key: string]: unknown;
}

interface SessionResponse {
  SessionToken: string;
  [key: string]: unknown;
}

interface CachedAuthToken {
  value: string;
  expiresAt: number;
}

let cachedAuthToken: CachedAuthToken | null = null;

export interface EbscoSession {
  authToken: string;
  sessionToken: string;
}

export interface EbscoSearchOptions {
  query: string;
  resultsPerPage?: number;
  pageNumber?: number;
  sort?: string;
  view?: "title" | "brief" | "detailed";
  includeFacets?: boolean;
  guest?: boolean;
}

export function isEbscoConfigured(): boolean {
  return Boolean(EBSCO_EDS_USER_ID && EBSCO_EDS_PASSWORD && EBSCO_EDS_PROFILE);
}

export function ebscoStatus() {
  return {
    configured: isEbscoConfigured(),
    apiBase: EBSCO_EDS_BASE_URL,
    profileConfigured: Boolean(EBSCO_EDS_PROFILE),
    apiKeyConfigured: Boolean(EBSCO_EDS_API_KEY),
    authentication: "EDS UID/password + auth token + per-operation session token",
    searchFields: {
      ISBN: "IB",
      title: "TI",
      author: "AU",
      subject: "SU",
      publisher: "PB",
      resourceType: "PT",
    },
    fullText: "dynamic retrieve; returned URLs may expire",
  };
}

function standardHeaders(contentType?: string): HeadersInit {
  return {
    Accept: "application/json",
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(EBSCO_EDS_API_KEY ? { "x-api-key": EBSCO_EDS_API_KEY } : {}),
    "User-Agent": "AccessiBooks-Hospitals/1.0",
  };
}

async function parseJsonResponse<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${label} failed with HTTP ${response.status}${text ? `: ${text.slice(0, 500)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label} returned a non-JSON response`);
  }
}

async function authenticateEbsco(): Promise<string> {
  if (!isEbscoConfigured()) {
    throw new Error(
      "EBSCO EDS is not configured. Set EBSCO_EDS_USER_ID, EBSCO_EDS_PASSWORD and EBSCO_EDS_PROFILE.",
    );
  }

  if (cachedAuthToken && cachedAuthToken.expiresAt > Date.now() + 60_000) {
    return cachedAuthToken.value;
  }

  const response = await fetch(
    new URL("/authservice/rest/uidauth", EBSCO_EDS_BASE_URL),
    {
      method: "POST",
      headers: standardHeaders("application/json"),
      body: JSON.stringify({
        UserId: EBSCO_EDS_USER_ID,
        Password: EBSCO_EDS_PASSWORD,
        InterfaceId: EBSCO_EDS_INTERFACE_ID,
      }),
    },
  );

  const payload = await parseJsonResponse<AuthResponse>(
    response,
    "EBSCO authentication",
  );
  if (!payload.AuthToken) throw new Error("EBSCO authentication returned no AuthToken");

  const timeoutSeconds = Number(payload.AuthTimeout || 1800);
  cachedAuthToken = {
    value: payload.AuthToken,
    expiresAt: Date.now() + Math.max(timeoutSeconds - 60, 60) * 1000,
  };
  return payload.AuthToken;
}

async function createEbscoSession(
  authToken: string,
  guest = false,
): Promise<string> {
  const response = await fetch(
    new URL("/edsapi/rest/createsession", EBSCO_EDS_BASE_URL),
    {
      method: "POST",
      headers: {
        ...standardHeaders("application/json"),
        "x-authenticationToken": authToken,
      },
      body: JSON.stringify({
        Profile: EBSCO_EDS_PROFILE,
        Guest: guest ? "y" : "n",
        Org: EBSCO_EDS_ORG,
      }),
    },
  );

  const payload = await parseJsonResponse<SessionResponse>(
    response,
    "EBSCO create session",
  );
  if (!payload.SessionToken) throw new Error("EBSCO create session returned no SessionToken");
  return payload.SessionToken;
}

async function endEbscoSession(session: EbscoSession): Promise<void> {
  try {
    await fetch(new URL("/edsapi/rest/endsession", EBSCO_EDS_BASE_URL), {
      method: "POST",
      headers: {
        ...standardHeaders("application/json"),
        "x-authenticationToken": session.authToken,
      },
      body: JSON.stringify({ SessionToken: session.sessionToken }),
    });
  } catch {
    // Session expiry is server managed. Ending is best-effort cleanup.
  }
}

async function withEbscoSession<T>(
  fn: (session: EbscoSession) => Promise<T>,
  guest = false,
): Promise<T> {
  const authToken = await authenticateEbsco();
  const sessionToken = await createEbscoSession(authToken, guest);
  const session = { authToken, sessionToken };
  try {
    return await fn(session);
  } finally {
    await endEbscoSession(session);
  }
}

function sessionHeaders(session: EbscoSession): HeadersInit {
  return {
    ...standardHeaders(),
    "x-authenticationToken": session.authToken,
    "x-sessionToken": session.sessionToken,
  };
}

export async function getEbscoProfileInfo(): Promise<Record<string, unknown>> {
  return withEbscoSession(async (session) => {
    const response = await fetch(new URL("/edsapi/rest/info", EBSCO_EDS_BASE_URL), {
      headers: sessionHeaders(session),
    });
    return parseJsonResponse<Record<string, unknown>>(response, "EBSCO profile info");
  });
}

export async function searchEbsco(
  options: EbscoSearchOptions,
): Promise<Record<string, unknown>> {
  if (!options.query.trim()) throw new Error("EBSCO search query is required");

  return withEbscoSession(async (session) => {
    const url = new URL("/edsapi/rest/search", EBSCO_EDS_BASE_URL);
    url.searchParams.append("query-1", options.query.trim());
    url.searchParams.set(
      "resultsperpage",
      String(Math.min(Math.max(options.resultsPerPage ?? 20, 1), 100)),
    );
    url.searchParams.set("pagenumber", String(Math.max(options.pageNumber ?? 1, 1)));
    url.searchParams.set("sort", options.sort ?? "relevance");
    url.searchParams.set("view", options.view ?? "detailed");
    url.searchParams.set("includefacets", options.includeFacets === false ? "n" : "y");

    const response = await fetch(url, { headers: sessionHeaders(session) });
    return parseJsonResponse<Record<string, unknown>>(response, "EBSCO search");
  }, options.guest ?? false);
}

export async function searchEbscoByIsbn(
  isbn: string,
  options: Omit<EbscoSearchOptions, "query"> = {},
): Promise<Record<string, unknown>> {
  const normalised = isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (!/^\d{13}$/.test(normalised) && !/^\d{9}[\dX]$/.test(normalised)) {
    throw new Error("ISBN must be ISBN-10 or ISBN-13");
  }
  return searchEbsco({
    ...options,
    query: `IB:${normalised}`,
  });
}

export async function retrieveEbscoRecord(input: {
  dbId: string;
  an: string;
  ebookPreferredFormat?: string;
  guest?: boolean;
}): Promise<Record<string, unknown>> {
  if (!input.dbId.trim() || !input.an.trim()) {
    throw new Error("EBSCO retrieve requires dbId and an");
  }

  return withEbscoSession(async (session) => {
    const response = await fetch(
      new URL("/edsapi/rest/retrieve", EBSCO_EDS_BASE_URL),
      {
        method: "POST",
        headers: {
          ...sessionHeaders(session),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          DbId: input.dbId,
          An: input.an,
          ...(input.ebookPreferredFormat
            ? { EbookPreferredFormat: input.ebookPreferredFormat }
            : {}),
        }),
      },
    );
    return parseJsonResponse<Record<string, unknown>>(response, "EBSCO retrieve");
  }, input.guest ?? false);
}

export function summariseEbscoFullText(record: Record<string, unknown>) {
  const json = JSON.stringify(record);
  const hasHtml = /"Availability"\s*:\s*"1"/i.test(json);
  const hasPdf = /"Type"\s*:\s*"(pdflink|ebook-pdf)"/i.test(json);
  const hasEpub = /"Type"\s*:\s*"ebook-epub"/i.test(json);
  const hasLinkedFullText = /"Type"\s*:\s*"other"/i.test(json);

  return {
    hasHtml,
    hasPdf,
    hasEpub,
    hasLinkedFullText,
    dynamicRetrievalRequired: hasPdf || hasEpub || hasLinkedFullText,
    note:
      "EBSCO full-text URLs may expire. Retrieve the record at access time rather than persisting returned URLs.",
  };
}
