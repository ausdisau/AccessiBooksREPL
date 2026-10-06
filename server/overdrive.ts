const OVERDRIVE_TOKEN_URL = process.env.OVERDRIVE_TOKEN_URL || "https://oauth.overdrive.com/token";
const OVERDRIVE_API_BASE = process.env.OVERDRIVE_API_BASE || "https://api.overdrive.com";
const OVERDRIVE_CLIENT_KEY = process.env.OVERDRIVE_CLIENT_KEY || "";
const OVERDRIVE_CLIENT_SECRET = process.env.OVERDRIVE_CLIENT_SECRET || "";
const OVERDRIVE_LIBRARY_ID = process.env.OVERDRIVE_LIBRARY_ID || "";
const OVERDRIVE_COLLECTION_TOKEN = process.env.OVERDRIVE_COLLECTION_TOKEN || "";

interface CachedToken {
  value: string;
  expiresAt: number;
  scope?: string;
}

let cachedToken: CachedToken | null = null;

interface OverDriveTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface OverDriveTitleLinkResult {
  title: string;
  creators?: string[];
  mediaType?: string;
  languages?: string[];
  shareLink?: {
    href?: string;
    type?: string;
  };
}

export interface OverDriveLibraryAccount {
  id: number;
  name: string;
  type?: string;
  collectionToken?: string;
  links?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OverDriveSearchProduct {
  id: string;
  crossRefId?: number;
  mediaType?: string;
  title: string;
  subtitle?: string;
  primaryCreator?: { role?: string; name?: string };
  formats?: Array<{
    id?: string;
    name?: string;
    identifiers?: Array<{ type?: string; value?: string }>;
  }>;
  otherFormatIdentifiers?: Array<{ type?: string; value?: string }>;
  isOwnedByCollections?: boolean;
  links?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OverDriveSearchResponse {
  limit?: number;
  offset?: number;
  totalItems?: number;
  id?: string;
  products?: OverDriveSearchProduct[];
  [key: string]: unknown;
}

export function isOverDriveConfigured() {
  return Boolean(OVERDRIVE_CLIENT_KEY && OVERDRIVE_CLIENT_SECRET);
}

async function getOverDriveToken(): Promise<string> {
  if (!isOverDriveConfigured()) {
    throw new Error("OverDrive is not configured. Set OVERDRIVE_CLIENT_KEY and OVERDRIVE_CLIENT_SECRET.");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const credentials = Buffer.from(`${OVERDRIVE_CLIENT_KEY}:${OVERDRIVE_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const response = await fetch(OVERDRIVE_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "AccessiBooks-Hospitals/1.0",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OverDrive OAuth failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 400)}` : ""}`);
  }

  const payload = (await response.json()) as OverDriveTokenResponse;
  cachedToken = {
    value: payload.access_token,
    scope: payload.scope,
    expiresAt: Date.now() + Math.max((payload.expires_in || 3600) - 60, 60) * 1000,
  };
  return cachedToken.value;
}

async function overDriveGet<T>(pathOrUrl: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const token = await getOverDriveToken();
  const url = pathOrUrl.startsWith("http") ? new URL(pathOrUrl) : new URL(pathOrUrl, OVERDRIVE_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
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
    throw new Error(`OverDrive request failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`);
  }
  return (await response.json()) as T;
}

export async function findOverDriveTitleLink(input: {
  title?: string;
  creator?: string;
  isbn?: string;
  mediaType?: "ebook" | "audiobook";
}) {
  if (!input.title && !input.isbn) throw new Error("OverDrive Title Link lookup requires title or digital ISBN");
  return overDriveGet<OverDriveTitleLinkResult>("/v1/share/find", {
    title: input.title,
    creator: input.creator,
    isbn: input.isbn,
    mediaType: input.mediaType,
  });
}

export async function getOverDriveLibraryAccount(): Promise<OverDriveLibraryAccount> {
  if (!OVERDRIVE_LIBRARY_ID) throw new Error("OVERDRIVE_LIBRARY_ID is not configured");
  return overDriveGet<OverDriveLibraryAccount>(`/v1/libraries/${OVERDRIVE_LIBRARY_ID}`);
}

export async function resolveOverDriveCollectionToken(): Promise<string> {
  if (OVERDRIVE_COLLECTION_TOKEN) return OVERDRIVE_COLLECTION_TOKEN;
  const account = await getOverDriveLibraryAccount();
  if (!account.collectionToken) throw new Error("OverDrive library account did not return a collection token");
  return account.collectionToken;
}

export async function searchOverDriveCollection(input: {
  q?: string;
  identifier?: string;
  formats?: string[];
  availability?: boolean;
  limit?: number;
}) {
  const collectionToken = await resolveOverDriveCollectionToken();
  return overDriveGet<OverDriveSearchResponse>(
    `/v1/collections/${encodeURIComponent(collectionToken)}/products`,
    {
      q: input.q,
      identifier: input.identifier,
      formats: input.formats?.join(","),
      availability: input.availability,
      limit: Math.min(Math.max(input.limit ?? 25, 1), 2000),
    },
  );
}

export function overDriveStatus() {
  return {
    configured: isOverDriveConfigured(),
    apiBase: OVERDRIVE_API_BASE,
    libraryIdConfigured: Boolean(OVERDRIVE_LIBRARY_ID),
    collectionTokenConfigured: Boolean(OVERDRIVE_COLLECTION_TOKEN),
    discoveryMode: OVERDRIVE_LIBRARY_ID || OVERDRIVE_COLLECTION_TOKEN ? "institution_collection" : "title_link_only",
    requiredApproval: true,
  };
}
