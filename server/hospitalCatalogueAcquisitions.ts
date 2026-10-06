import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  hospitalCatalogueItems,
  hospitalCatalogueSuppliers,
  hospitalCatalogueAcquisitions,
  hospitalCatalogueAccessRoutes,
  type HospitalCatalogueAcquisition,
} from "@shared/schema";

const supplierSeeds = [
  {
    code: "worldcat",
    name: "OCLC WorldCat",
    supplierType: "bibliographic_metadata",
    websiteUrl: "https://www.oclc.org/worldcat.html",
    integrationStatus: "in_testing",
    supportsDiscovery: true,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: false,
    configurationNote:
      "Bibliographic discovery only. WorldCat metadata does not grant AccessiBooks content supply rights.",
  },
  {
    code: "overdrive",
    name: "OverDrive",
    supplierType: "digital_library",
    websiteUrl: "https://www.overdrive.com/",
    integrationStatus: "planned",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: true,
    supportsInstitutionalLicensing: true,
    supportsAccessibleFormats: false,
    configurationNote:
      "API access requires approval and institutional/vendor credentials. Entitlements are collection-specific.",
  },
  {
    code: "vitalsource",
    name: "VitalSource Bookshelf",
    supplierType: "commercial_delivery",
    websiteUrl: "https://www.vitalsource.com/",
    integrationStatus: "recommended",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: false,
    supportsInstitutionalLicensing: true,
    supportsAccessibleFormats: true,
    configurationNote:
      "High-priority commercial ebook integration. REST APIs cover inventory, licences, fulfilment and SSO; product detail can expose publisher-supplied W3C-mapped accessibility claims.",
  },
  {
    code: "ebsco",
    name: "EBSCO",
    supplierType: "institutional_content",
    websiteUrl: "https://www.ebsco.com/",
    integrationStatus: "candidate",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: false,
    supportsInstitutionalLicensing: true,
    supportsAccessibleFormats: false,
    configurationNote:
      "Useful when a hospital or health network has an EBSCO subscription. EDS, HoldingsIQ, LinkIQ and entitlement APIs expose institution-specific discovery and access.",
  },
  {
    code: "bowker",
    name: "Bowker Book Data",
    supplierType: "bibliographic_metadata",
    websiteUrl: "https://www.bowker.com/bowker-book-data",
    integrationStatus: "candidate",
    supportsDiscovery: true,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: false,
    configurationNote:
      "Licensed ISBN/bibliographic enrichment source. Book Metadata Service exposes REST lookup but does not confer content rights.",
  },
  {
    code: "prh-api",
    name: "Penguin Random House API",
    supplierType: "publisher_metadata",
    websiteUrl: "https://developer.penguinrandomhouse.com/",
    integrationStatus: "candidate",
    supportsDiscovery: true,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: false,
    configurationNote:
      "Public publisher metadata API with ISBN title resources, related works and retail links. Metadata only; licensing remains separate.",
  },
  {
    code: "google-books",
    name: "Google Books",
    supplierType: "discovery_preview",
    websiteUrl: "https://developers.google.com/books",
    integrationStatus: "existing",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: false,
    configurationNote:
      "Useful for ISBN/OCLC discovery, previews and location-aware viewability. Google explicitly says the API is not a replacement for commercial metadata services.",
  },
  {
    code: "amazon-creators",
    name: "Amazon Creators API",
    supplierType: "retail_affiliate",
    websiteUrl: "https://affiliate-program.amazon.com/creatorsapi",
    integrationStatus: "migration_required",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: false,
    configurationNote:
      "Replacement for deprecated PA-API 5. OAuth 2.0 with official Node.js SDK. Retail discovery only; do not treat as hospital content entitlement.",
  },
  {
    code: "spotify-audiobooks",
    name: "Spotify Audiobooks",
    supplierType: "consumer_streaming",
    websiteUrl: "https://developer.spotify.com/documentation/web-api/",
    integrationStatus: "existing_metadata_only",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: false,
    configurationNote:
      "Audiobook metadata is available for Australia. Spotify content cannot be downloaded; use only as an attributed external consumer route.",
  },
  {
    code: "ingram-coresource",
    name: "Ingram CoreSource",
    supplierType: "publisher_distribution",
    websiteUrl: "https://www.ingramcontent.com/publishers/digital-sales-distribution",
    integrationStatus: "partnership",
    supportsDiscovery: false,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: true,
    configurationNote:
      "Publisher-side digital asset and metadata distribution to hundreds of retail/library channels. Relevant if AccessiBooks becomes an approved distribution destination or accepts publisher feeds.",
  },
  {
    code: "onix-direct",
    name: "Direct Publisher ONIX 3.x Feed",
    supplierType: "publisher_metadata",
    websiteUrl: "https://www.editeur.org/",
    integrationStatus: "recommended",
    supportsDiscovery: true,
    supportsAvailability: true,
    supportsCheckout: false,
    supportsInstitutionalLicensing: true,
    supportsAccessibleFormats: true,
    configurationNote:
      "Preferred vendor-neutral publisher ingestion format. Accept ONIX 3.0/3.1 only; ONIX 2.1 is obsolete. Preserve product identifiers, supply detail, epub licence and accessibility metadata.",
  },
  {
    code: "eplatform",
    name: "ePlatform by Wheelers",
    supplierType: "digital_library",
    websiteUrl: "https://www.eplatform.co/au/",
    integrationStatus: "planned",
    supportsDiscovery: false,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: true,
    supportsAccessibleFormats: false,
    configurationNote:
      "Institutional ebook/audiobook purchasing is supported. API capability must be confirmed for the relevant customer agreement.",
  },
  {
    code: "direct-publisher",
    name: "Direct publisher licence",
    supplierType: "publisher",
    integrationStatus: "manual",
    supportsDiscovery: false,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: true,
    supportsAccessibleFormats: true,
    configurationNote:
      "Use for publisher-specific hospital or accessible-format agreements. Record agreement evidence before activation.",
  },
  {
    code: "accessible-format-authority",
    name: "Authorised accessible-format source",
    supplierType: "accessible_format",
    integrationStatus: "manual",
    supportsDiscovery: false,
    supportsAvailability: false,
    supportsCheckout: false,
    supportsInstitutionalLicensing: false,
    supportsAccessibleFormats: true,
    configurationNote:
      "Use only after the lawful basis for accessible-format supply has been reviewed and recorded.",
  },
] as const;

export async function ensureHospitalCatalogueSuppliersSeeded() {
  for (const supplier of supplierSeeds) {
    await db
      .insert(hospitalCatalogueSuppliers)
      .values(supplier)
      .onConflictDoUpdate({
        target: hospitalCatalogueSuppliers.code,
        set: {
          name: supplier.name,
          supplierType: supplier.supplierType,
          websiteUrl: supplier.websiteUrl ?? null,
          integrationStatus: supplier.integrationStatus,
          supportsDiscovery: supplier.supportsDiscovery,
          supportsAvailability: supplier.supportsAvailability,
          supportsCheckout: supplier.supportsCheckout,
          supportsInstitutionalLicensing: supplier.supportsInstitutionalLicensing,
          supportsAccessibleFormats: supplier.supportsAccessibleFormats,
          configurationNote: supplier.configurationNote,
          updatedAt: new Date(),
        },
      });
  }
}

export async function listHospitalCatalogueSuppliers() {
  await ensureHospitalCatalogueSuppliersSeeded();
  return db.select().from(hospitalCatalogueSuppliers);
}

export interface CreateAcquisitionInput {
  catalogueItemId: string;
  supplierCode?: string;
  supplierTitleId?: string | null;
  supplierUrl?: string | null;
  scopeType?: string;
  scopeKey?: string;
  acquisitionStatus?: string;
  licenceModel?: string;
  accessMode?: string;
  territory?: string;
  formats?: string[];
  accessibilityFeatures?: string[];
  copiesOrSeats?: number | null;
  concurrentUsers?: number | null;
  loanPeriodDays?: number | null;
  agreementReference?: string | null;
  rightsBasis?: string;
  rightsNote?: string | null;
  termsUrl?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
}

async function supplierIdFor(code?: string): Promise<string | null> {
  if (!code) return null;
  await ensureHospitalCatalogueSuppliersSeeded();
  const [supplier] = await db
    .select({ id: hospitalCatalogueSuppliers.id })
    .from(hospitalCatalogueSuppliers)
    .where(eq(hospitalCatalogueSuppliers.code, code))
    .limit(1);
  return supplier?.id ?? null;
}

export async function createHospitalCatalogueAcquisition(input: CreateAcquisitionInput) {
  const [item] = await db
    .select({ id: hospitalCatalogueItems.id })
    .from(hospitalCatalogueItems)
    .where(eq(hospitalCatalogueItems.id, input.catalogueItemId))
    .limit(1);
  if (!item) throw new Error("Catalogue item not found");

  if (input.acquisitionStatus === "active" && !input.verifiedAt) {
    throw new Error("An active acquisition requires verifiedAt");
  }

  const supplierId = await supplierIdFor(input.supplierCode);
  if (input.supplierCode && !supplierId) {
    throw new Error(`Unknown supplier code: ${input.supplierCode}`);
  }

  const [acquisition] = await db
    .insert(hospitalCatalogueAcquisitions)
    .values({
      catalogueItemId: input.catalogueItemId,
      supplierId,
      supplierTitleId: input.supplierTitleId ?? null,
      supplierUrl: input.supplierUrl ?? null,
      scopeType: input.scopeType ?? "program",
      scopeKey: input.scopeKey ?? "accessibooks-hospitals",
      acquisitionStatus: input.acquisitionStatus ?? "under_review",
      licenceModel: input.licenceModel ?? "unknown",
      accessMode: input.accessMode ?? "external",
      territory: input.territory ?? "AU",
      formats: input.formats ?? [],
      accessibilityFeatures: input.accessibilityFeatures ?? [],
      copiesOrSeats: input.copiesOrSeats ?? null,
      concurrentUsers: input.concurrentUsers ?? null,
      loanPeriodDays: input.loanPeriodDays ?? null,
      agreementReference: input.agreementReference ?? null,
      rightsBasis: input.rightsBasis ?? "commercial_licence",
      rightsNote: input.rightsNote ?? null,
      termsUrl: input.termsUrl ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      verifiedAt: input.verifiedAt ?? null,
      verifiedBy: input.verifiedBy ?? null,
    })
    .returning();

  await recomputeCatalogueEntitlement(input.catalogueItemId);
  return acquisition;
}

export interface CreateAccessRouteInput {
  acquisitionId: string;
  format: string;
  routeType?: string;
  url?: string | null;
  requiresAuthentication?: boolean;
  requiresLibraryCard?: boolean;
  drmProtected?: boolean;
  downloadAllowed?: boolean;
  offlineAllowed?: boolean;
  accessibleFormat?: boolean;
  accessibilityFeatures?: string[];
  availabilityStatus?: string;
  lastVerifiedAt?: Date | null;
}

export async function createHospitalCatalogueAccessRoute(input: CreateAccessRouteInput) {
  const [acquisition] = await db
    .select()
    .from(hospitalCatalogueAcquisitions)
    .where(eq(hospitalCatalogueAcquisitions.id, input.acquisitionId))
    .limit(1);
  if (!acquisition) throw new Error("Acquisition not found");

  if (input.availabilityStatus === "available" && !input.lastVerifiedAt) {
    throw new Error("An available access route requires lastVerifiedAt");
  }

  const [route] = await db
    .insert(hospitalCatalogueAccessRoutes)
    .values({
      acquisitionId: input.acquisitionId,
      format: input.format,
      routeType: input.routeType ?? "external_link",
      url: input.url ?? null,
      requiresAuthentication: input.requiresAuthentication ?? true,
      requiresLibraryCard: input.requiresLibraryCard ?? false,
      drmProtected: input.drmProtected ?? false,
      downloadAllowed: input.downloadAllowed ?? false,
      offlineAllowed: input.offlineAllowed ?? false,
      accessibleFormat: input.accessibleFormat ?? false,
      accessibilityFeatures: input.accessibilityFeatures ?? [],
      availabilityStatus: input.availabilityStatus ?? "not_verified",
      lastVerifiedAt: input.lastVerifiedAt ?? null,
    })
    .returning();

  await recomputeCatalogueEntitlement(acquisition.catalogueItemId);
  return route;
}

function isCurrent(acquisition: HospitalCatalogueAcquisition, now: Date) {
  if (acquisition.acquisitionStatus !== "active") return false;
  if (!acquisition.verifiedAt) return false;
  if (acquisition.startsAt && acquisition.startsAt > now) return false;
  if (acquisition.endsAt && acquisition.endsAt <= now) return false;
  return true;
}

function routeFormatFlags(formats: string[]) {
  const lower = new Set(formats.map((format) => format.toLowerCase()));
  return {
    hasAudio: lower.has("audiobook") || lower.has("audio"),
    hasEbook: lower.has("ebook") || lower.has("epub"),
    hasHtml: lower.has("html"),
    hasPlainText: lower.has("text") || lower.has("plain-text"),
    hasPdf: lower.has("pdf"),
    hasDaisy: lower.has("daisy"),
    hasLargePrint: lower.has("large-print"),
    hasBraille: lower.has("braille"),
    transcriptAvailable: lower.has("transcript"),
  };
}

export async function recomputeCatalogueEntitlement(catalogueItemId: string) {
  const acquisitions = await db
    .select()
    .from(hospitalCatalogueAcquisitions)
    .where(eq(hospitalCatalogueAcquisitions.catalogueItemId, catalogueItemId));

  const now = new Date();
  const active = acquisitions.filter((acquisition) => isCurrent(acquisition, now));

  if (!active.length) {
    await db
      .update(hospitalCatalogueItems)
      .set({
        acquisitionStatus: acquisitions.length ? "under_review" : "not_acquired",
        updatedAt: now,
      })
      .where(eq(hospitalCatalogueItems.id, catalogueItemId));
    return;
  }

  const activeIds = active.map((acquisition) => acquisition.id);
  const allRoutes = [];
  for (const acquisitionId of activeIds) {
    const routes = await db
      .select()
      .from(hospitalCatalogueAccessRoutes)
      .where(eq(hospitalCatalogueAccessRoutes.acquisitionId, acquisitionId));
    allRoutes.push(...routes);
  }

  const availableRoutes = allRoutes.filter(
    (route) => route.availabilityStatus === "available" && route.lastVerifiedAt,
  );
  const formats = availableRoutes.map((route) => route.format);
  const flags = routeFormatFlags(formats);

  if (!availableRoutes.length) {
    await db
      .update(hospitalCatalogueItems)
      .set({
        acquisitionStatus: "active_no_verified_route",
        rightsStatus: "licensed_access_recorded",
        availabilityStatus: "metadata_only",
        rightsVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(hospitalCatalogueItems.id, catalogueItemId));
    return;
  }

  const hasHosted = availableRoutes.some((route) => route.routeType === "hosted");
  const hasAccessible = availableRoutes.some((route) => route.accessibleFormat);
  const accessibilityFeatures = [
    ...new Set(availableRoutes.flatMap((route) => route.accessibilityFeatures ?? [])),
  ];

  await db
    .update(hospitalCatalogueItems)
    .set({
      acquisitionStatus: "active",
      rightsStatus: "licensed_access_recorded",
      availabilityStatus: hasHosted ? "licensed_hosted" : "licensed_external_access",
      rightsVerifiedAt: now,
      ...flags,
      ttsFriendly:
        flags.hasEbook &&
        (accessibilityFeatures.includes("tts") ||
          accessibilityFeatures.includes("screen-reader") ||
          hasAccessible),
      updatedAt: now,
    })
    .where(eq(hospitalCatalogueItems.id, catalogueItemId));
}

export async function getHospitalCatalogueAcquisitions(catalogueItemId: string) {
  await ensureHospitalCatalogueSuppliersSeeded();
  const acquisitions = await db
    .select()
    .from(hospitalCatalogueAcquisitions)
    .where(eq(hospitalCatalogueAcquisitions.catalogueItemId, catalogueItemId));

  const result = [];
  for (const acquisition of acquisitions) {
    const routes = await db
      .select()
      .from(hospitalCatalogueAccessRoutes)
      .where(eq(hospitalCatalogueAccessRoutes.acquisitionId, acquisition.id));
    result.push({ ...acquisition, routes });
  }
  return result;
}


export async function updateHospitalCatalogueAcquisition(
  acquisitionId: string,
  patch: Partial<Omit<CreateAcquisitionInput, "catalogueItemId" | "supplierCode">> & { supplierCode?: string | null },
) {
  const [existing] = await db
    .select()
    .from(hospitalCatalogueAcquisitions)
    .where(eq(hospitalCatalogueAcquisitions.id, acquisitionId))
    .limit(1);
  if (!existing) throw new Error("Acquisition not found");

  if (patch.acquisitionStatus === "active" && !(patch.verifiedAt ?? existing.verifiedAt)) {
    throw new Error("An active acquisition requires verifiedAt");
  }

  let supplierId = existing.supplierId;
  if (patch.supplierCode !== undefined) {
    supplierId = patch.supplierCode ? await supplierIdFor(patch.supplierCode) : null;
    if (patch.supplierCode && !supplierId) throw new Error(`Unknown supplier code: ${patch.supplierCode}`);
  }

  const [updated] = await db
    .update(hospitalCatalogueAcquisitions)
    .set({
      ...(patch.supplierCode !== undefined && { supplierId }),
      ...(patch.supplierTitleId !== undefined && { supplierTitleId: patch.supplierTitleId }),
      ...(patch.supplierUrl !== undefined && { supplierUrl: patch.supplierUrl }),
      ...(patch.scopeType !== undefined && { scopeType: patch.scopeType }),
      ...(patch.scopeKey !== undefined && { scopeKey: patch.scopeKey }),
      ...(patch.acquisitionStatus !== undefined && { acquisitionStatus: patch.acquisitionStatus }),
      ...(patch.licenceModel !== undefined && { licenceModel: patch.licenceModel }),
      ...(patch.accessMode !== undefined && { accessMode: patch.accessMode }),
      ...(patch.territory !== undefined && { territory: patch.territory }),
      ...(patch.formats !== undefined && { formats: patch.formats }),
      ...(patch.accessibilityFeatures !== undefined && { accessibilityFeatures: patch.accessibilityFeatures }),
      ...(patch.copiesOrSeats !== undefined && { copiesOrSeats: patch.copiesOrSeats }),
      ...(patch.concurrentUsers !== undefined && { concurrentUsers: patch.concurrentUsers }),
      ...(patch.loanPeriodDays !== undefined && { loanPeriodDays: patch.loanPeriodDays }),
      ...(patch.agreementReference !== undefined && { agreementReference: patch.agreementReference }),
      ...(patch.rightsBasis !== undefined && { rightsBasis: patch.rightsBasis }),
      ...(patch.rightsNote !== undefined && { rightsNote: patch.rightsNote }),
      ...(patch.termsUrl !== undefined && { termsUrl: patch.termsUrl }),
      ...(patch.startsAt !== undefined && { startsAt: patch.startsAt }),
      ...(patch.endsAt !== undefined && { endsAt: patch.endsAt }),
      ...(patch.verifiedAt !== undefined && { verifiedAt: patch.verifiedAt }),
      ...(patch.verifiedBy !== undefined && { verifiedBy: patch.verifiedBy }),
      updatedAt: new Date(),
    })
    .where(eq(hospitalCatalogueAcquisitions.id, acquisitionId))
    .returning();

  await recomputeCatalogueEntitlement(existing.catalogueItemId);
  return updated;
}

export async function updateHospitalCatalogueAccessRoute(
  routeId: string,
  patch: Partial<Omit<CreateAccessRouteInput, "acquisitionId">>,
) {
  const [existingRoute] = await db
    .select()
    .from(hospitalCatalogueAccessRoutes)
    .where(eq(hospitalCatalogueAccessRoutes.id, routeId))
    .limit(1);
  if (!existingRoute) throw new Error("Access route not found");

  if (patch.availabilityStatus === "available" && !(patch.lastVerifiedAt ?? existingRoute.lastVerifiedAt)) {
    throw new Error("An available access route requires lastVerifiedAt");
  }

  const [updated] = await db
    .update(hospitalCatalogueAccessRoutes)
    .set({
      ...(patch.format !== undefined && { format: patch.format }),
      ...(patch.routeType !== undefined && { routeType: patch.routeType }),
      ...(patch.url !== undefined && { url: patch.url }),
      ...(patch.requiresAuthentication !== undefined && { requiresAuthentication: patch.requiresAuthentication }),
      ...(patch.requiresLibraryCard !== undefined && { requiresLibraryCard: patch.requiresLibraryCard }),
      ...(patch.drmProtected !== undefined && { drmProtected: patch.drmProtected }),
      ...(patch.downloadAllowed !== undefined && { downloadAllowed: patch.downloadAllowed }),
      ...(patch.offlineAllowed !== undefined && { offlineAllowed: patch.offlineAllowed }),
      ...(patch.accessibleFormat !== undefined && { accessibleFormat: patch.accessibleFormat }),
      ...(patch.accessibilityFeatures !== undefined && { accessibilityFeatures: patch.accessibilityFeatures }),
      ...(patch.availabilityStatus !== undefined && { availabilityStatus: patch.availabilityStatus }),
      ...(patch.lastVerifiedAt !== undefined && { lastVerifiedAt: patch.lastVerifiedAt }),
      updatedAt: new Date(),
    })
    .where(eq(hospitalCatalogueAccessRoutes.id, routeId))
    .returning();

  const [acquisition] = await db
    .select({ catalogueItemId: hospitalCatalogueAcquisitions.catalogueItemId })
    .from(hospitalCatalogueAcquisitions)
    .where(eq(hospitalCatalogueAcquisitions.id, existingRoute.acquisitionId))
    .limit(1);
  if (acquisition) await recomputeCatalogueEntitlement(acquisition.catalogueItemId);
  return updated;
}

export async function getPublicHospitalCatalogueAccessOptions(catalogueItemId: string) {
  await ensureHospitalCatalogueSuppliersSeeded();
  const acquisitions = await db
    .select({
      id: hospitalCatalogueAcquisitions.id,
      supplierId: hospitalCatalogueAcquisitions.supplierId,
      accessMode: hospitalCatalogueAcquisitions.accessMode,
      acquisitionStatus: hospitalCatalogueAcquisitions.acquisitionStatus,
      startsAt: hospitalCatalogueAcquisitions.startsAt,
      endsAt: hospitalCatalogueAcquisitions.endsAt,
      verifiedAt: hospitalCatalogueAcquisitions.verifiedAt,
      scopeType: hospitalCatalogueAcquisitions.scopeType,
      scopeKey: hospitalCatalogueAcquisitions.scopeKey,
    })
    .from(hospitalCatalogueAcquisitions)
    .where(eq(hospitalCatalogueAcquisitions.catalogueItemId, catalogueItemId));

  const now = new Date();
  const options = [];
  for (const acquisition of acquisitions) {
    const current =
      acquisition.acquisitionStatus === "active" &&
      Boolean(acquisition.verifiedAt) &&
      (!acquisition.startsAt || acquisition.startsAt <= now) &&
      (!acquisition.endsAt || acquisition.endsAt > now);
    if (!current) continue;

    let supplierName: string | null = null;
    if (acquisition.supplierId) {
      const [supplier] = await db
        .select({ name: hospitalCatalogueSuppliers.name })
        .from(hospitalCatalogueSuppliers)
        .where(eq(hospitalCatalogueSuppliers.id, acquisition.supplierId))
        .limit(1);
      supplierName = supplier?.name ?? null;
    }

    const routes = await db
      .select()
      .from(hospitalCatalogueAccessRoutes)
      .where(eq(hospitalCatalogueAccessRoutes.acquisitionId, acquisition.id));

    for (const route of routes) {
      if (route.availabilityStatus !== "available" || !route.lastVerifiedAt) continue;
      options.push({
        acquisitionId: acquisition.id,
        supplierName,
        accessMode: acquisition.accessMode,
        scopeType: acquisition.scopeType,
        scopeKey: acquisition.scopeKey,
        format: route.format,
        routeType: route.routeType,
        url: route.url,
        requiresAuthentication: route.requiresAuthentication,
        requiresLibraryCard: route.requiresLibraryCard,
        drmProtected: route.drmProtected,
        downloadAllowed: route.downloadAllowed,
        offlineAllowed: route.offlineAllowed,
        accessibleFormat: route.accessibleFormat,
        accessibilityFeatures: route.accessibilityFeatures ?? [],
        lastVerifiedAt: route.lastVerifiedAt,
      });
    }
  }
  return options;
}
