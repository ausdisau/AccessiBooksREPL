import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  hospitalKnowledgeEnrichmentRuns,
  hospitalKnowledgeItems,
  hospitalKnowledgeSources,
  type HospitalKnowledgeItem,
} from "@shared/schema";
import { importCrossrefDoi } from "./hospitalKnowledge";
import {
  getSpringerNatureFullTextJatsByDoi,
  getSpringerNatureMetaByDoi,
  isSpringerNatureConfigured,
} from "./springerNature";
import {
  getScienceDirectArticleByDoi,
  isScienceDirectConfigured,
} from "./scienceDirect";
import {
  searchWebOfScienceDocuments,
  webOfScienceStatus,
} from "./webOfScience";
import { isEbscoConfigured, searchEbsco } from "./ebsco";

export type DoiEnrichmentProvider =
  | "crossref"
  | "springerNature"
  | "scienceDirect"
  | "webOfScience"
  | "ebsco";

export interface DoiEnrichmentOptions {
  providers?: DoiEnrichmentProvider[];
  includeFullText?: boolean;
  trigger?: string;
  createdBy?: string | null;
}

export interface ProviderResult {
  provider: DoiEnrichmentProvider;
  status: "success" | "skipped" | "error";
  matched?: boolean;
  message?: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  citationCount?: number | null;
  fullTextReturned?: boolean;
}

export interface DoiEnrichmentResult {
  runId: string;
  doi: string;
  knowledgeItem: HospitalKnowledgeItem;
  providerResults: Record<string, ProviderResult>;
  errors: Record<string, string>;
  status: "completed" | "partial" | "failed";
}

const defaultProviders: DoiEnrichmentProvider[] = [
  "crossref",
  "springerNature",
  "scienceDirect",
  "webOfScience",
  "ebsco",
];

function cleanDoi(value: string): string {
  const doi = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
  if (!doi.includes("/")) throw new Error("A valid DOI is required");
  return doi;
}

function objectValue(
  value: unknown,
  key: string,
): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normaliseDoiValue(value: unknown): string | null {
  const text = stringValue(value);
  if (!text) return null;
  return text
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

function findFirstObjectWithDoi(
  value: unknown,
  doi: string,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 10 || value == null) return null;

  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findFirstObjectWithDoi(child, doi, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const [key, child] of Object.entries(record)) {
    if (/^doi$|digital.?object.?identifier/i.test(key)) {
      const candidate = normaliseDoiValue(child);
      if (candidate === doi) return record;
    }
  }

  for (const child of Object.values(record)) {
    const found = findFirstObjectWithDoi(child, doi, depth + 1);
    if (found) return found;
  }
  return null;
}

function extractSpringerRecord(
  response: Record<string, unknown>,
  doi: string,
): Record<string, unknown> | null {
  const records = objectValue(response, "records");
  if (!Array.isArray(records)) return findFirstObjectWithDoi(response, doi);

  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const obj = record as Record<string, unknown>;
    const identifier = stringValue(obj.identifier);
    if (identifier && normaliseDoiValue(identifier) === doi) return obj;
    const found = findFirstObjectWithDoi(obj, doi);
    if (found) return obj;
  }
  return null;
}

function extractSpringerUrl(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  const urls = record.url;
  if (Array.isArray(urls)) {
    for (const entry of urls) {
      if (!entry || typeof entry !== "object") continue;
      const value = stringValue((entry as Record<string, unknown>).value);
      if (value) return value;
    }
  }
  return stringValue(record.url);
}

function extractWebOfScienceHit(
  response: Record<string, unknown>,
  doi: string,
): Record<string, unknown> | null {
  const hits = response.hits;
  if (!Array.isArray(hits)) return findFirstObjectWithDoi(response, doi);

  for (const hit of hits) {
    if (!hit || typeof hit !== "object") continue;
    const obj = hit as Record<string, unknown>;
    const identifiers = objectValue(obj, "identifiers");
    const hitDoi =
      identifiers && typeof identifiers === "object"
        ? normaliseDoiValue((identifiers as Record<string, unknown>).doi)
        : null;
    if (hitDoi === doi) return obj;
  }
  return null;
}

function extractWebOfScienceCitationCount(
  hit: Record<string, unknown> | null,
): number | null {
  if (!hit) return null;
  const citations = hit.citations;
  if (!Array.isArray(citations)) return null;

  const wos = citations.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const dbValue = stringValue((entry as Record<string, unknown>).db);
    return dbValue?.toUpperCase() === "WOS";
  });

  if (wos && typeof wos === "object") {
    return numberValue((wos as Record<string, unknown>).count);
  }

  for (const entry of citations) {
    if (!entry || typeof entry !== "object") continue;
    const count = numberValue((entry as Record<string, unknown>).count);
    if (count != null) return count;
  }
  return null;
}

function extractWebOfScienceUrl(
  hit: Record<string, unknown> | null,
): string | null {
  if (!hit) return null;
  const links = hit.links;
  if (!links || typeof links !== "object") return null;
  return stringValue((links as Record<string, unknown>).record);
}

function extractWebOfScienceUid(
  hit: Record<string, unknown> | null,
): string | null {
  return hit ? stringValue(hit.uid) : null;
}

function scienceDirectCoreData(
  response: Record<string, unknown>,
): Record<string, unknown> | null {
  const root = objectValue(response, "full-text-retrieval-response");
  if (!root || typeof root !== "object") return null;
  const core = objectValue(root, "coredata");
  return core && typeof core === "object"
    ? (core as Record<string, unknown>)
    : null;
}

function scienceDirectUrl(
  response: Record<string, unknown>,
  doi: string,
): string {
  const core = scienceDirectCoreData(response);
  const link = core ? objectValue(core, "link") : null;

  if (Array.isArray(link)) {
    for (const entry of link) {
      if (!entry || typeof entry !== "object") continue;
      const href = stringValue((entry as Record<string, unknown>)["@href"]);
      if (href) return href;
    }
  }

  return "https://doi.org/" + doi;
}

function scienceDirectHasFullText(
  response: Record<string, unknown>,
): boolean {
  const root = objectValue(response, "full-text-retrieval-response");
  if (!root || typeof root !== "object") return false;
  const obj = root as Record<string, unknown>;
  return Boolean(
    obj.originalText ||
      obj.fullText ||
      obj["body"] ||
      obj["original-text"] ||
      obj["full-text"],
  );
}

async function upsertKnowledgeSource(input: {
  knowledgeItemId: string;
  provider: string;
  providerRecordId?: string | null;
  url: string;
  role: string;
  accessStatus: string;
  entitlementRequired: boolean;
  rawMetadata: Record<string, unknown>;
}) {
  await db
    .insert(hospitalKnowledgeSources)
    .values({
      knowledgeItemId: input.knowledgeItemId,
      provider: input.provider,
      providerRecordId: input.providerRecordId ?? null,
      url: input.url,
      role: input.role,
      accessStatus: input.accessStatus,
      entitlementRequired: input.entitlementRequired,
      rawMetadata: input.rawMetadata,
      lastVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [hospitalKnowledgeSources.provider, hospitalKnowledgeSources.url],
      set: {
        knowledgeItemId: input.knowledgeItemId,
        providerRecordId: input.providerRecordId ?? null,
        role: input.role,
        accessStatus: input.accessStatus,
        entitlementRequired: input.entitlementRequired,
        rawMetadata: input.rawMetadata,
        lastVerifiedAt: new Date(),
      },
    });
}

async function enrichSpringer(
  item: HospitalKnowledgeItem,
  doi: string,
  includeFullText: boolean,
): Promise<ProviderResult> {
  if (!isSpringerNatureConfigured()) {
    return {
      provider: "springerNature",
      status: "skipped",
      message: "Springer Nature API key is not configured",
    };
  }

  const response = await getSpringerNatureMetaByDoi(doi);
  const record = extractSpringerRecord(response, doi);
  const matched = Boolean(record);
  const url = extractSpringerUrl(record) ?? "https://doi.org/" + doi;

  let fullTextReturned = false;
  let fullTextError: string | null = null;

  if (matched && includeFullText) {
    try {
      const xml = await getSpringerNatureFullTextJatsByDoi(doi);
      fullTextReturned = /<article[\s>]/i.test(xml);
      if (fullTextReturned) {
        await upsertKnowledgeSource({
          knowledgeItemId: item.id,
          provider: "Springer Nature",
          providerRecordId: doi,
          url: url + "#full-text-jats",
          role: "full_text",
          accessStatus: "provider_returned_full_text",
          entitlementRequired: true,
          rawMetadata: {
            doi,
            format: "JATS",
            fullTextReturned: true,
            note:
              "Full text was returned by the provider for this credentialed request. This does not make the record patient-facing or independently establish redistribution rights.",
          },
        });
      }
    } catch (error) {
      fullTextError = error instanceof Error ? error.message : String(error);
    }
  }

  await upsertKnowledgeSource({
    knowledgeItemId: item.id,
    provider: "Springer Nature",
    providerRecordId: doi,
    url,
    role: "metadata",
    accessStatus: matched ? "metadata_match" : "no_exact_match",
    entitlementRequired: true,
    rawMetadata: response,
  });

  const providerAbstract =
    record && typeof record.abstract === "string"
      ? record.abstract.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;

  if (providerAbstract && !item.abstract) {
    await db
      .update(hospitalKnowledgeItems)
      .set({
        abstract: providerAbstract,
        updatedAt: new Date(),
      })
      .where(eq(hospitalKnowledgeItems.id, item.id));
  }

  return {
    provider: "springerNature",
    status: "success",
    matched,
    sourceId: doi,
    sourceUrl: url,
    fullTextReturned,
    ...(fullTextError
      ? { message: "Metadata succeeded; full-text probe failed: " + fullTextError }
      : {}),
  };
}

async function enrichScienceDirect(
  item: HospitalKnowledgeItem,
  doi: string,
  includeFullText: boolean,
): Promise<ProviderResult> {
  if (!isScienceDirectConfigured()) {
    return {
      provider: "scienceDirect",
      status: "skipped",
      message: "Elsevier API key is not configured",
    };
  }

  const response = await getScienceDirectArticleByDoi({
    doi,
    view: includeFullText ? "FULL" : "META_ABS",
    accept: "application/json",
  });

  if (!response || typeof response !== "object") {
    throw new Error("ScienceDirect returned an unexpected response");
  }

  const raw = response as Record<string, unknown>;
  const url = scienceDirectUrl(raw, doi);
  const core = scienceDirectCoreData(raw);
  const returnedDoi =
    core &&
    (normaliseDoiValue(core["prism:doi"]) ||
      normaliseDoiValue(core.doi));
  const matched = returnedDoi ? returnedDoi === doi : true;
  const fullTextReturned = includeFullText && scienceDirectHasFullText(raw);

  await upsertKnowledgeSource({
    knowledgeItemId: item.id,
    provider: "ScienceDirect",
    providerRecordId:
      core ? stringValue(core["dc:identifier"]) ?? doi : doi,
    url,
    role: fullTextReturned ? "full_text" : "metadata",
    accessStatus: fullTextReturned
      ? "provider_returned_full_text"
      : "metadata_or_abstract",
    entitlementRequired: true,
    rawMetadata: raw,
  });

  const abstract =
    core &&
    (stringValue(core["dc:description"]) ||
      stringValue(core["dc:abstract"]));
  if (abstract && !item.abstract) {
    await db
      .update(hospitalKnowledgeItems)
      .set({
        abstract: abstract.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        updatedAt: new Date(),
      })
      .where(eq(hospitalKnowledgeItems.id, item.id));
  }

  return {
    provider: "scienceDirect",
    status: "success",
    matched,
    sourceId:
      core ? stringValue(core["dc:identifier"]) ?? doi : doi,
    sourceUrl: url,
    fullTextReturned,
  };
}

async function enrichWebOfScience(
  item: HospitalKnowledgeItem,
  doi: string,
): Promise<ProviderResult> {
  if (!webOfScienceStatus().starterConfigured) {
    return {
      provider: "webOfScience",
      status: "skipped",
      message: "Web of Science Starter API key is not configured",
    };
  }

  const response = await searchWebOfScienceDocuments({
    q: "DO=(" + doi + ")",
    db: "WOS",
    limit: 10,
    page: 1,
    detail: "full",
  });
  const hit = extractWebOfScienceHit(response, doi);
  const citationCount = extractWebOfScienceCitationCount(hit);
  const uid = extractWebOfScienceUid(hit);
  const url =
    extractWebOfScienceUrl(hit) ??
    "https://www.webofscience.com/wos/woscc/basic-search";

  await upsertKnowledgeSource({
    knowledgeItemId: item.id,
    provider: "Web of Science",
    providerRecordId: uid ?? doi,
    url: uid ? url : url + "?doi=" + encodeURIComponent(doi),
    role: "metrics",
    accessStatus: hit ? "matched" : "no_exact_match",
    entitlementRequired: true,
    rawMetadata: response,
  });

  if (citationCount != null) {
    await db
      .update(hospitalKnowledgeItems)
      .set({
        citationCount,
        metricsSource: "Web of Science",
        metricsVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(hospitalKnowledgeItems.id, item.id));
  }

  return {
    provider: "webOfScience",
    status: "success",
    matched: Boolean(hit),
    sourceId: uid,
    sourceUrl: url,
    citationCount,
  };
}

async function enrichEbsco(
  item: HospitalKnowledgeItem,
  doi: string,
): Promise<ProviderResult> {
  if (!isEbscoConfigured()) {
    return {
      provider: "ebsco",
      status: "skipped",
      message: "EBSCO EDS profile is not configured",
    };
  }

  // EDS search fields are profile-defined. DOI is therefore searched as an
  // unfielded identifier and retained as a candidate result unless the response
  // itself contains the exact DOI.
  const response = await searchEbsco({
    query: doi,
    resultsPerPage: 20,
    pageNumber: 1,
    view: "detailed",
    includeFacets: false,
  });
  const matchedRecord = findFirstObjectWithDoi(response, doi);
  const matched = Boolean(matchedRecord);
  const url =
    "https://eds-api.ebscohost.com/edsapi/rest/search?query-1=" +
    encodeURIComponent(doi);

  await upsertKnowledgeSource({
    knowledgeItemId: item.id,
    provider: "EBSCO EDS",
    providerRecordId: doi,
    url,
    role: "institutional_discovery",
    accessStatus: matched
      ? "doi_match_candidate"
      : "candidate_results_unverified",
    entitlementRequired: true,
    rawMetadata: response,
  });

  return {
    provider: "ebsco",
    status: "success",
    matched,
    sourceId: doi,
    sourceUrl: url,
    message: matched
      ? "Exact DOI was found in the returned EDS response; retrieve is still required for current full-text access."
      : "EDS returned candidate results but no exact DOI was verified in the response.",
  };
}

export async function enrichHospitalKnowledgeByDoi(
  doiInput: string,
  options: DoiEnrichmentOptions = {},
): Promise<DoiEnrichmentResult> {
  const doi = cleanDoi(doiInput);
  const requested: DoiEnrichmentProvider[] = [
    ...new Set<DoiEnrichmentProvider>([
      "crossref",
      ...(options.providers?.length ? options.providers : defaultProviders),
    ]),
  ];

  const [run] = await db
    .insert(hospitalKnowledgeEnrichmentRuns)
    .values({
      doi,
      trigger: options.trigger ?? "manual",
      status: "running",
      requestedProviders: requested,
      providerResults: {},
      errors: {},
      createdBy: options.createdBy ?? null,
    })
    .returning();

  const providerResults: Record<string, ProviderResult> = {};
  const errors: Record<string, string> = {};
  let item: HospitalKnowledgeItem;

  try {
    item = await importCrossrefDoi(doi);
    providerResults.crossref = {
      provider: "crossref",
      status: "success",
      matched: true,
      sourceId: doi,
      sourceUrl: item.sourceUrl,
    };

    await db
      .update(hospitalKnowledgeEnrichmentRuns)
      .set({ knowledgeItemId: item.id })
      .where(eq(hospitalKnowledgeEnrichmentRuns.id, run.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.crossref = message;
    providerResults.crossref = {
      provider: "crossref",
      status: "error",
      matched: false,
      message,
    };

    await db
      .update(hospitalKnowledgeEnrichmentRuns)
      .set({
        status: "failed",
        providerResults,
        errors,
        finishedAt: new Date(),
      })
      .where(eq(hospitalKnowledgeEnrichmentRuns.id, run.id));

    throw new Error("Crossref identity step failed: " + message);
  }

  const optionalProviders = requested.filter(
    (provider) => provider !== "crossref",
  );

  const jobs = optionalProviders.map(async (provider) => {
    try {
      let result: ProviderResult;

      switch (provider) {
        case "springerNature":
          result = await enrichSpringer(
            item,
            doi,
            options.includeFullText === true,
          );
          break;
        case "scienceDirect":
          result = await enrichScienceDirect(
            item,
            doi,
            options.includeFullText === true,
          );
          break;
        case "webOfScience":
          result = await enrichWebOfScience(item, doi);
          break;
        case "ebsco":
          result = await enrichEbsco(item, doi);
          break;
        default:
          result = {
            provider,
            status: "skipped",
            message: "Provider is not supported by the orchestrator",
          };
      }

      providerResults[provider] = result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors[provider] = message;
      providerResults[provider] = {
        provider,
        status: "error",
        matched: false,
        message,
      };
    }
  });

  await Promise.all(jobs);

  const [refreshed] = await db
    .select()
    .from(hospitalKnowledgeItems)
    .where(eq(hospitalKnowledgeItems.id, item.id))
    .limit(1);
  if (refreshed) item = refreshed;

  const providerValues = Object.values(providerResults);
  const errorCount = providerValues.filter(
    (result) => result.status === "error",
  ).length;
  const successCount = providerValues.filter(
    (result) => result.status === "success",
  ).length;

  const status: DoiEnrichmentResult["status"] =
    errorCount === 0
      ? "completed"
      : successCount > 0
        ? "partial"
        : "failed";

  await db
    .update(hospitalKnowledgeEnrichmentRuns)
    .set({
      status,
      providerResults,
      errors,
      finishedAt: new Date(),
    })
    .where(eq(hospitalKnowledgeEnrichmentRuns.id, run.id));

  return {
    runId: run.id,
    doi,
    knowledgeItem: item,
    providerResults,
    errors,
    status,
  };
}

export async function getHospitalKnowledgeEnrichmentRun(id: string) {
  const [run] = await db
    .select()
    .from(hospitalKnowledgeEnrichmentRuns)
    .where(eq(hospitalKnowledgeEnrichmentRuns.id, id))
    .limit(1);
  return run;
}

export async function listHospitalKnowledgeSources(knowledgeItemId: string) {
  return db
    .select()
    .from(hospitalKnowledgeSources)
    .where(eq(hospitalKnowledgeSources.knowledgeItemId, knowledgeItemId));
}
