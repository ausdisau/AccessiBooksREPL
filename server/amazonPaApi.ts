/**
 * Amazon Product Advertising API 5.0 (PA-API) client for books/audiobooks.
 * Requires: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG.
 * PA-API is deprecated April 2026; migrate to Creators API when available.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

export interface AmazonBookItem {
  asin: string;
  title: string;
  author: string;
  detailPageUrl: string;
  imageUrl: string | null;
}

function isConfigured(): boolean {
  return !!(process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY && process.env.AMAZON_PARTNER_TAG);
}

function parseResponse(data: unknown): AmazonBookItem[] {
  const out: AmazonBookItem[] = [];
  const searchResult = (data as Record<string, unknown>)?.SearchResult as Record<string, unknown> | undefined;
  const items = (searchResult?.Items as unknown[] | undefined) ?? [];
  for (const item of items) {
    const i = item as Record<string, unknown>;
    const title = (i.ItemInfo as Record<string, unknown>)?.Title as Record<string, string> | undefined;
    const titleStr = title?.DisplayValue ?? title?.Label ?? "";
    const byLine = (i.ItemInfo as Record<string, unknown>)?.ByLineInfo as Record<string, unknown> | undefined;
    const contributors = (byLine?.Contributors as { Name?: string }[] | undefined) ?? [];
    const author = contributors.map((c) => c.Name).filter(Boolean).join(", ") || "Unknown Author";
    const detailUrl = (i.DetailPageURL as string) ?? "";
    const images = i.Images as Record<string, Record<string, Record<string, string>> | undefined>;
    const primary = images?.Primary;
    const imageUrl = primary?.Large?.URL ?? primary?.Medium?.URL ?? primary?.Small?.URL ?? null;
    if (i.ASIN && titleStr) {
      out.push({ asin: String(i.ASIN), title: titleStr, author, detailPageUrl: detailUrl, imageUrl });
    }
  }
  return out;
}

/**
 * Search Amazon Books. Returns empty array if not configured or on error.
 */
export function searchAmazonBooks(keywords: string, itemCount: number = 10): Promise<AmazonBookItem[]> {
  if (!isConfigured()) return Promise.resolve([]);

  return new Promise((resolve) => {
    try {
      const ProductAdvertisingAPIv1 = require("paapi5-nodejs-sdk");
      const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
      defaultClient.accessKey = process.env.AMAZON_ACCESS_KEY;
      defaultClient.secretKey = process.env.AMAZON_SECRET_KEY;
      defaultClient.host = process.env.AMAZON_HOST || "webservices.amazon.com";
      defaultClient.region = process.env.AMAZON_REGION || "us-east-1";

      const api = new ProductAdvertisingAPIv1.DefaultApi();
      const searchItemsRequest = new ProductAdvertisingAPIv1.SearchItemsRequest();
      searchItemsRequest["PartnerTag"] = process.env.AMAZON_PARTNER_TAG;
      searchItemsRequest["PartnerType"] = "Associates";
      searchItemsRequest["Keywords"] = keywords;
      searchItemsRequest["SearchIndex"] = "Books";
      searchItemsRequest["ItemCount"] = Math.min(itemCount, 10);
      searchItemsRequest["Resources"] = [
        "ItemInfo.Title",
        "ItemInfo.ByLineInfo",
        "Images.Primary.Medium",
        "Images.Primary.Large",
        "Offers.Listings.Price",
      ];

      api.searchItems(searchItemsRequest, (error: unknown, data: unknown) => {
        if (error) {
          console.warn("Amazon PA-API error:", error instanceof Error ? error.message : error);
          resolve([]);
          return;
        }
        resolve(parseResponse(data ?? {}));
      });
    } catch (err) {
      console.warn("Amazon PA-API error:", err instanceof Error ? err.message : err);
      resolve([]);
    }
  });
}

function parseItem(item: unknown): AmazonBookItem | null {
  const i = item as Record<string, unknown>;
  const title = (i.ItemInfo as Record<string, unknown>)?.Title as Record<string, string> | undefined;
  const titleStr = title?.DisplayValue ?? title?.Label ?? "";
  const byLine = (i.ItemInfo as Record<string, unknown>)?.ByLineInfo as Record<string, unknown> | undefined;
  const contributors = (byLine?.Contributors as { Name?: string }[] | undefined) ?? [];
  const author = contributors.map((c) => c.Name).filter(Boolean).join(", ") || "Unknown Author";
  const detailUrl = (i.DetailPageURL as string) ?? "";
  const images = i.Images as Record<string, Record<string, Record<string, string>> | undefined>;
  const primary = images?.Primary;
  const imageUrl = primary?.Large?.URL ?? primary?.Medium?.URL ?? primary?.Small?.URL ?? null;
  if (i.ASIN && titleStr) {
    return { asin: String(i.ASIN), title: titleStr, author, detailPageUrl: detailUrl, imageUrl };
  }
  return null;
}

/**
 * Get a single book by ASIN (for getBook resolution). Returns null if not configured or not found.
 */
export function getAmazonItem(asin: string): Promise<AmazonBookItem | null> {
  if (!isConfigured()) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const ProductAdvertisingAPIv1 = require("paapi5-nodejs-sdk");
      const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
      defaultClient.accessKey = process.env.AMAZON_ACCESS_KEY;
      defaultClient.secretKey = process.env.AMAZON_SECRET_KEY;
      defaultClient.host = process.env.AMAZON_HOST || "webservices.amazon.com";
      defaultClient.region = process.env.AMAZON_REGION || "us-east-1";

      const api = new ProductAdvertisingAPIv1.DefaultApi();
      const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
      getItemsRequest["PartnerTag"] = process.env.AMAZON_PARTNER_TAG;
      getItemsRequest["PartnerType"] = "Associates";
      getItemsRequest["ItemIds"] = [asin];
      getItemsRequest["Resources"] = [
        "ItemInfo.Title",
        "ItemInfo.ByLineInfo",
        "Images.Primary.Medium",
        "Images.Primary.Large",
      ];

      api.getItems(getItemsRequest, (error: unknown, data: unknown) => {
        if (error) {
          resolve(null);
          return;
        }
        const itemsResult = (data as Record<string, unknown>)?.ItemsResult as Record<string, unknown> | undefined;
        const items = (itemsResult?.Items as unknown[] | undefined) ?? [];
        const first = items[0];
        resolve(first ? parseItem(first) : null);
      });
    } catch {
      resolve(null);
    }
  });
}
