/**
 * The legacy PA-API 5 client must never mix Amazon advertising content into
 * the public catalogue. The new optional Creators integration is isolated
 * behind /api/catalogue/search?source=amazon-creators and two approval flags.
 * Keep this compatibility interface inert to preserve callers.
 */
export interface AmazonBookItem {
  asin: string;
  title: string;
  author: string;
  detailPageUrl: string;
  imageUrl: string | null;
}
export async function searchAmazonBooks(_keywords: string, _itemCount = 10): Promise<AmazonBookItem[]> {
  return [];
}
export async function getAmazonItem(_asin: string): Promise<AmazonBookItem | null> {
  return null;
}
