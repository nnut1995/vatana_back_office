import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Shared S3 client for the `vatana-backoffice` bucket (ap-southeast-1).
 *
 * Like the Mongo client, this is created lazily and cached on the global
 * object so `next build` does not need the credentials, and so serverless
 * invocations reuse one connection pool instead of opening a new one.
 */
declare global {
  var _s3Client: S3Client | undefined;
}

export const S3_BUCKET = process.env.S3_BUCKET || "vatana-backoffice";
export const S3_REGION = process.env.S3_REGION || "ap-southeast-1";

/** Prefix every product photo is stored under, inside the bucket. */
export const PRODUCT_IMAGE_PREFIX = "products/";

export function getS3Client(): S3Client {
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Invalid/Missing environment variables: "S3_ACCESS_KEY" and "S3_SECRET_ACCESS_KEY"',
    );
  }

  if (!global._s3Client) {
    global._s3Client = new S3Client({
      region: S3_REGION,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return global._s3Client;
}

/**
 * Object keys come back from the client (stored on the order) so they must be
 * validated before being handed to S3 — only keys we ourselves minted under
 * the product prefix are ever readable.
 */
export function isProductImageKey(key: string): boolean {
  return /^products\/[A-Za-z0-9_-]+\.webp$/.test(key);
}

/**
 * Best-effort removal of an image that is no longer referenced. A failure here
 * only leaves a stray object in the bucket, so it must never fail the request
 * that replaced it.
 */
export async function deleteProductImage(key: string): Promise<void> {
  if (!isProductImageKey(key)) return;
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
  } catch (error) {
    console.warn(`Failed to delete orphaned image ${key}:`, error);
  }
}
