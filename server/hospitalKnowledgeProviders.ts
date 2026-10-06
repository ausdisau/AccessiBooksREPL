import { db } from "./db";
import { hospitalKnowledgeProviders } from "@shared/schema";

const providers = [
  {
    code: "crossref",
    name: "Crossref REST API",
    providerType: "scholarly_metadata",
    websiteUrl: "https://www.crossref.org/documentation/retrieve-metadata/rest-api/",
    integrationStatus: "available_connector",
    supportsMetadata: true,
    supportsAbstracts: true,
    supportsFullText: false,
    supportsCitationMetrics: true,
    supportsNews: false,
    entitlementRequired: false,
    configurationNote:
      "Public REST API; polite pool recommended via mailto. DOI metadata, licences, funding, ORCID/ROR, abstracts where deposited and reference counts. Not a full-text entitlement source.",
  },
  {
    code: "springer-nature",
    name: "Springer Nature APIs",
    providerType: "publisher_research",
    websiteUrl: "https://dev.springernature.com/",
    integrationStatus: "credential_ready",
    supportsMetadata: true,
    supportsAbstracts: true,
    supportsFullText: true,
    supportsCitationMetrics: false,
    supportsNews: false,
    entitlementRequired: true,
    configurationNote:
      "Meta API plus Open Access/Full Text APIs. API key required. Full text is restricted to content and uses permitted by Springer Nature API/TDM terms.",
  },
  {
    code: "web-of-science",
    name: "Web of Science APIs",
    providerType: "citation_bibliometrics",
    websiteUrl: "https://developer.clarivate.com/apis/wos-starter",
    integrationStatus: "credential_ready",
    supportsMetadata: true,
    supportsAbstracts: false,
    supportsFullText: false,
    supportsCitationMetrics: true,
    supportsNews: false,
    entitlementRequired: true,
    configurationNote:
      "Starter API for article-level metadata/times-cited; Journals API for JCR journal-level metrics. Journals API requires paid JCR/InCites licence.",
  },
  {
    code: "sciencedirect",
    name: "Elsevier ScienceDirect APIs",
    providerType: "publisher_research",
    websiteUrl: "https://dev.elsevier.com/sd_apis.html",
    integrationStatus: "credential_ready",
    supportsMetadata: true,
    supportsAbstracts: true,
    supportsFullText: true,
    supportsCitationMetrics: false,
    supportsNews: false,
    entitlementRequired: true,
    configurationNote:
      "API key required. Article Retrieval by DOI returns full text only when the caller is entitled or the article is Open Access; otherwise metadata/abstract access is limited.",
  },
  {
    code: "newsapi",
    name: "News API",
    providerType: "news_discovery",
    websiteUrl: "https://newsapi.org/",
    integrationStatus: "credential_ready",
    supportsMetadata: true,
    supportsAbstracts: false,
    supportsFullText: false,
    supportsCitationMetrics: false,
    supportsNews: true,
    entitlementRequired: true,
    configurationNote:
      "Headline/article discovery only. Developer plan is development-only and delayed; production requires a paid plan. API does not supply full article text.",
  },
  {
    code: "lexisnexis-daas",
    name: "Nexis Data as a Service",
    providerType: "licensed_news_archive",
    websiteUrl: "https://professional.lexisnexis.com/PPC-Dev-Portal-Display",
    integrationStatus: "partnership_required",
    supportsMetadata: true,
    supportsAbstracts: true,
    supportsFullText: true,
    supportsCitationMetrics: false,
    supportsNews: true,
    entitlementRequired: true,
    configurationNote:
      "Enterprise/partner provisioning required. Nexis DaaS supports search/retrieve, archives and monitoring; exact REST/OData endpoints and datasets depend on the licensed product.",
  },
] as const;

export async function ensureHospitalKnowledgeProvidersSeeded() {
  for (const provider of providers) {
    await db
      .insert(hospitalKnowledgeProviders)
      .values(provider)
      .onConflictDoUpdate({
        target: hospitalKnowledgeProviders.code,
        set: {
          name: provider.name,
          providerType: provider.providerType,
          websiteUrl: provider.websiteUrl,
          integrationStatus: provider.integrationStatus,
          supportsMetadata: provider.supportsMetadata,
          supportsAbstracts: provider.supportsAbstracts,
          supportsFullText: provider.supportsFullText,
          supportsCitationMetrics: provider.supportsCitationMetrics,
          supportsNews: provider.supportsNews,
          entitlementRequired: provider.entitlementRequired,
          configurationNote: provider.configurationNote,
          updatedAt: new Date(),
        },
      });
  }
}

export async function listHospitalKnowledgeProviders() {
  await ensureHospitalKnowledgeProvidersSeeded();
  return db.select().from(hospitalKnowledgeProviders);
}
