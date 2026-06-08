/**
 * Cloudflare R2 storage (S3-compatible).
 * Stores previews and final downloads, returns signed URLs.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3: S3Client | null = null;

function client() {
  if (s3) return s3;
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    return null;
  }
  s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

const BUCKET = process.env.R2_BUCKET_NAME || "pixel-art-studio";

export async function uploadPng(key: string, body: Buffer): Promise<boolean> {
  const c = client();
  if (!c) return false;
  await c.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/png",
    })
  );
  return true;
}

export async function downloadPng(key: string): Promise<Buffer | null> {
  const c = client();
  if (!c) return null;
  try {
    const res = await c.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    if (!res.Body) return null;
    // AWS SDK v3 returns a stream. Buffer it.
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of res.Body as any) {
      chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  const c = client();
  if (!c) return false;
  try {
    await c.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
  filename?: string
): Promise<string | null> {
  const c = client();
  if (!c) return null;
  const url = await getSignedUrl(
    c,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      // When a filename is supplied, the browser will save the file
      // instead of displaying the PNG inline.
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename}"`
        : undefined,
    }),
    { expiresIn: expiresInSeconds }
  );
  return url;
}
