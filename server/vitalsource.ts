const VITALSOURCE_API_BASE =
  process.env.VITALSOURCE_API_BASE || "https://api.vitalsource.com";
const VITALSOURCE_API_KEY = process.env.VITALSOURCE_API_KEY || "";

export interface VitalSourceContributor {
  name?: string | null;
  type?: string | null;
}

export interface VitalSourcePrice {
  type?: string | null;
  value?: string | number | null;
  currency?: string | null;
  territory?: string | null;
  discount_code?: string | null;
}

export interface VitalSourceVariant {
  duration?: string | number | null;
  online_duration?: string | number | null;
  sku?: string | null;
  type?: string | null;
  distributable?: boolean | null;
  off_sale_date?: string | null;
  prices?: VitalSourcePrice[];
  updated?: string | null;
  [key: string]: unknown;
}

export interface VitalSourceProduct {
  vbid: string;
  kind?: string | null;
  title: string;
  subtitle?: string | null;
  format?: string | null;
  publisher?: string | null;
  edition?: string | number | null;
  contributors?: VitalSourceContributor[];
  language?: string | null;
  created?: string | null;
  off_sale_date?: string | null;
  on_sale_date?: string | null;
  print_restrictions?: number | string | null;
  copy_restrictions?: number | string | null;
  identifiers?: Record<string, unknown> & {
    print_isbn_canonical?: string | null;
    eisbn_canonical?: string | null;
    isbn_canonical?: string | null;
    isbn_10?: string | null;
    isbn_13?: string | null;
    e_isbn?: string | null;
    e_isbn_10?: string | null;
    e_isbn_13?: string | null;
    print_isbn?: string | null;
    print_isbn_10?: string | null;
    print_isbn_13?: string | null;
  };
  metadata?: Record<string, unknown> & {
    description?: string | null;
    publication_date?: string | null;
    copyright_date?: string | null;
    imprint_name?: string | null;
    page_count?: number | null;
  };
  subjects?: Array<Record<string, unknown> & { name?: string | null; code?: string | null; schema?: string | null }>;
  accessibility_claims?: Record<string, unknown> | unknown[];
  accessibility_categories?: unknown[];
  resource_links?: {
    metadata?: string | null;
    cover_image?: string | null;
    table_of_contents?: string | null;
    store_url?: string | null;
    [key: string]: unknown;
  };
  sales_rights?: string[];
  exclude_sales_rights?: string[];
  variants?: VitalSourceVariant[];
  contents?: unknown[];
  [key: string]: unknown;
}

export interface VitalSourceProductPage {
  num_items?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  items?: VitalSourceProduct[];
}

export interface VitalSourceFulfillmentRequest {
  sku: string;
  term: string | number;
  onlineTerm?: string | number;
  ensureDays?: number;
  ensureOnlineDays?: number;
  ensureYears?: number;
  tag?: string;
}

export interface VitalSourceFulfillmentResponse {
  code?: string;
  sku?: string;
  vbid?: string;
  title?: string;
  author?: string;
  publisher?: string;
  imprint?: string;
  download_license?: Record<string, unknown>;
  online_license?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VitalSourceLicense {
  sku?: string;
  isbn?: string;
  name?: string;
  publisher?: string;
  imprint?: string;
  type?: string;
  expiration?: string;
  kind?: string;
  term?: string;
  [key: string]: string | undefined;
}

export interface VitalSourceRedirect {
  url: string;
  expires?: string;
}

export function isVitalSourceConfigured(): boolean {
  return Boolean(VITALSOURCE_API_KEY);
}

export function vitalSourceStatus() {
  return {
    configured: isVitalSourceConfigured(),
    apiBase: VITALSOURCE_API_BASE,
    inventoryAuth: "X-VitalSource-API-Key",
    userOperationsRequireAccessToken: true,
    accessTokenStorage: "not_persisted_by_catalogue_connector",
  };
}

function apiHeaders(accessToken?: string, contentType?: string): HeadersInit {
  if (!isVitalSourceConfigured()) {
    throw new Error("VitalSource is not configured. Set VITALSOURCE_API_KEY.");
  }
  return {
    Accept: "application/json, application/xml;q=0.9, text/xml;q=0.8",
    "X-VitalSource-API-Key": VITALSOURCE_API_KEY,
    ...(accessToken ? { "X-VitalSource-Access-Token": accessToken } : {}),
    ...(contentType ? { "Content-Type": contentType } : {}),
    "User-Agent": "AccessiBooks-Hospitals/1.0",
  };
}

async function vitalSourceRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  const url = path.startsWith("http") ? path : new URL(path, VITALSOURCE_API_BASE).toString();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...apiHeaders(accessToken, init.body ? "application/json" : undefined),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `VitalSource request failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`,
    );
  }
  return response;
}

export async function getVitalSourceProduct(
  identifier: string,
  options: { includeDetails?: string[] } = {},
): Promise<VitalSourceProduct> {
  const clean = identifier.trim();
  if (!clean) throw new Error("VitalSource product identifier is required");
  const url = new URL(`/v4/products/${encodeURIComponent(clean)}`, VITALSOURCE_API_BASE);
  const includeDetails =
    options.includeDetails ?? ["metadata", "subjects", "identifiers", "accessibility_claims"];
  if (includeDetails.length) url.searchParams.set("include_details", includeDetails.join(","));

  const response = await vitalSourceRequest(url.toString());
  return (await response.json()) as VitalSourceProduct;
}

export async function listVitalSourceProducts(options: {
  page?: number;
  perPage?: number;
  from?: string;
  until?: string;
  currency?: string[];
  includeDetails?: string[];
} = {}): Promise<VitalSourceProductPage> {
  const url = new URL("/v4/products", VITALSOURCE_API_BASE);
  if (options.page) url.searchParams.set("page", String(options.page));
  if (options.perPage) url.searchParams.set("per_page", String(Math.min(Math.max(options.perPage, 1), 1000)));
  if (options.from) url.searchParams.set("from", options.from);
  if (options.until) url.searchParams.set("until", options.until);
  if (options.currency?.length) url.searchParams.set("currency", options.currency.join(","));
  if (options.includeDetails?.length) url.searchParams.set("include_details", options.includeDetails.join(","));

  const response = await vitalSourceRequest(url.toString());
  return (await response.json()) as VitalSourceProductPage;
}

export function vitalSourceAustralianDistribution(product: VitalSourceProduct): {
  status: "allowed" | "excluded" | "unknown";
  distributableVariantCount: number;
} {
  const sales = (product.sales_rights ?? []).map((v) => v.toUpperCase());
  const excluded = (product.exclude_sales_rights ?? []).map((v) => v.toUpperCase());
  const distributableVariantCount = (product.variants ?? []).filter((v) => v.distributable === true).length;

  if (excluded.includes("AU")) return { status: "excluded", distributableVariantCount };
  if (sales.length && sales.includes("AU")) return { status: "allowed", distributableVariantCount };
  return { status: "unknown", distributableVariantCount };
}

export function vitalSourceAccessibilityClaims(product: VitalSourceProduct): {
  raw: Record<string, unknown> | unknown[];
  categories: string[];
  status: "publisher_supplied" | "not_provided";
} {
  const raw =
    (product.accessibility_claims as Record<string, unknown> | unknown[] | undefined) ??
    (Array.isArray(product.accessibility_categories) ? product.accessibility_categories : {});

  const categories = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string" && value.trim()) categories.add(value.trim());
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (/category|name|label|title/i.test(key)) collect(child);
      }
    }
  };
  collect(raw);

  const hasRaw = Array.isArray(raw)
    ? raw.length > 0
    : raw && typeof raw === "object"
      ? Object.keys(raw).length > 0
      : false;

  return {
    raw,
    categories: [...categories],
    status: hasRaw ? "publisher_supplied" : "not_provided",
  };
}

export async function createVitalSourceFulfillment(
  accessToken: string,
  request: VitalSourceFulfillmentRequest,
): Promise<VitalSourceFulfillmentResponse> {
  if (!accessToken) throw new Error("VitalSource user access token is required");
  const response = await vitalSourceRequest(
    "/v4/fulfillments",
    {
      method: "POST",
      body: JSON.stringify({
        fulfillment: {
          sku: request.sku,
          term: String(request.term),
          ...(request.onlineTerm !== undefined && { online_term: String(request.onlineTerm) }),
          ...(request.ensureDays !== undefined && { ensure_days: request.ensureDays }),
          ...(request.ensureOnlineDays !== undefined && { ensure_online_days: request.ensureOnlineDays }),
          ...(request.ensureYears !== undefined && { ensure_years: request.ensureYears }),
          ...(request.tag && { tag: request.tag }),
        },
      }),
    },
    accessToken,
  );
  return (await response.json()) as VitalSourceFulfillmentResponse;
}

function parseXmlAttributes(fragment: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z0-9_-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(fragment))) attrs[match[1]] = match[2];
  return attrs;
}

export async function getVitalSourceLicenses(
  accessToken: string,
  sku?: string,
): Promise<{ licenses: VitalSourceLicense[]; rawXml: string }> {
  if (!accessToken) throw new Error("VitalSource user access token is required");
  const url = new URL("/v3/licenses.xml", VITALSOURCE_API_BASE);
  if (sku) {
    url.searchParams.set("sku", sku);
    url.searchParams.set("license_type", "all");
  }
  const response = await vitalSourceRequest(
    url.toString(),
    { headers: { Accept: "application/xml,text/xml" } },
    accessToken,
  );
  const rawXml = await response.text();
  const licenses: VitalSourceLicense[] = [];
  const re = /<license\s+([^>]*?)\/?\s*>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rawXml))) licenses.push(parseXmlAttributes(match[1]));
  return { licenses, rawXml };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function createVitalSourceBookshelfRedirect(
  accessToken: string,
  vbid?: string,
): Promise<VitalSourceRedirect> {
  if (!accessToken) throw new Error("VitalSource user access token is required");
  const destination = vbid
    ? `https://bookshelf.vitalsource.com/#/books/${encodeURIComponent(vbid)}`
    : "https://bookshelf.vitalsource.com/#/books";
  const xml = `<?xml version="1.0" encoding="UTF-8"?><redirect><destination>${escapeXml(destination)}</destination><brand>bookshelf.vitalsource.com</brand></redirect>`;

  const response = await vitalSourceRequest(
    "/v3/redirects.xml",
    {
      method: "POST",
      body: xml,
      headers: {
        Accept: "application/xml,text/xml",
        "Content-Type": "application/xml",
      },
    },
    accessToken,
  );
  const rawXml = await response.text();
  const match = rawXml.match(/auto-signin="([^"]+)"/);
  if (!match) throw new Error("VitalSource redirect response did not contain an auto-signin URL");
  const expires = rawXml.match(/expires="([^"]+)"/)?.[1];
  return { url: match[1], expires };
}
