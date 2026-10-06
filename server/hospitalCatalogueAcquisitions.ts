import { and, eq, isNull, lte, or, gte } from "drizzle-orm";
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
