/**
 * Storage adapter interface for S3 and GCS.
 * Used for uploaded audiobook files and optional cover images.
 */

export interface StorageObjectInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

export interface IStorageAdapter {
  putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  listObjects(prefix?: string): Promise<StorageObjectInfo[]>;
  deleteObject(key: string): Promise<void>;
}

// S3 implementation
async function createS3Adapter(): Promise<IStorageAdapter | null> {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  if (!region || !bucket) return null;
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const { GetObjectCommand: GetObj } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
        : undefined,
    });
    return {
      async putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
      },
      async getObject(key: string) {
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const chunks: Uint8Array[] = [];
        if (!out.Body) throw new Error("Empty body");
        for await (const chunk of out.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
        return Buffer.concat(chunks);
      },
      async getSignedUrl(key: string, expiresInSeconds = 3600) {
        return getSignedUrl(client, new GetObj({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
      },
      async listObjects(prefix = "") {
        const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
        return (list.Contents || []).map((c) => ({
          key: c.Key!,
          size: c.Size ?? 0,
          lastModified: c.LastModified ?? new Date(0),
          contentType: undefined,
        }));
      },
      async deleteObject(key: string) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      },
    };
  } catch {
    return null;
  }
}

// GCS implementation
async function createGCSAdapter(): Promise<IStorageAdapter | null> {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) return null;
  try {
    const { Storage } = await import("@google-cloud/storage");
    const storage = new Storage({ keyFilename: process.env.GCS_KEY_FILE || undefined });
    const bucket = storage.bucket(bucketName);
    return {
      async putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
        await bucket.file(key).save(Buffer.from(body), { contentType });
      },
      async getObject(key: string) {
        const [buf] = await bucket.file(key).download();
        return buf;
      },
      async getSignedUrl(key: string, expiresInSeconds = 3600) {
        const [url] = await bucket.file(key).getSignedUrl({
          action: "read",
          expires: Date.now() + expiresInSeconds * 1000,
        });
        return url;
      },
      async listObjects(prefix = "") {
        const [files] = await bucket.getFiles({ prefix: prefix || undefined });
        return Promise.all(
          files.map(async (f) => {
            const [meta] = await f.getMetadata();
            return {
              key: f.name,
              size: parseInt(String(meta.size || 0), 10),
              lastModified: meta.updated ? new Date(meta.updated) : new Date(0),
              contentType: meta.contentType as string | undefined,
            };
          })
        );
      },
      async deleteObject(key: string) {
        await bucket.file(key).delete();
      },
    };
  } catch {
    return null;
  }
}

let cachedS3: IStorageAdapter | null | undefined;
let cachedGCS: IStorageAdapter | null | undefined;

export async function getS3Adapter(): Promise<IStorageAdapter | null> {
  if (cachedS3 === undefined) cachedS3 = await createS3Adapter();
  return cachedS3;
}

export async function getGCSAdapter(): Promise<IStorageAdapter | null> {
  if (cachedGCS === undefined) cachedGCS = await createGCSAdapter();
  return cachedGCS;
}

/** Primary adapter: S3 if configured, else GCS, else null. */
export async function getPrimaryStorageAdapter(): Promise<IStorageAdapter | null> {
  const s3 = await getS3Adapter();
  if (s3) return s3;
  return getGCSAdapter();
}
