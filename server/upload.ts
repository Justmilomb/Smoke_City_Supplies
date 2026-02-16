import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import multer from "multer";
import { randomBytes } from "crypto";

// Use process.cwd() so uploads work when server is bundled as CJS (dist/index.cjs).
// Set UPLOADS_DIR to a persistent mount (for example Render Disk) in production.
const configuredUploadsDir = process.env.UPLOADS_DIR?.trim();
export const UPLOADS_DIR = configuredUploadsDir
  ? path.resolve(configuredUploadsDir)
  : path.join(process.cwd(), "uploads");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_BUCKET = process.env.R2_BUCKET?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.trim();
const R2_ENDPOINT = process.env.R2_ENDPOINT?.trim();
const R2_KEY_PREFIX = process.env.R2_KEY_PREFIX?.trim();

const hasR2Credentials = Boolean(R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
export const R2_UPLOADS_ENABLED = Boolean(hasR2Credentials && R2_PUBLIC_BASE_URL && (R2_ENDPOINT || R2_ACCOUNT_ID));

type R2ClientLike = { send: (command: unknown) => Promise<unknown> };
let r2Client: R2ClientLike | null = null;

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {
  // directory may already exist
}

if (process.env.NODE_ENV === "production") {
  if (R2_UPLOADS_ENABLED) {
    console.log("[upload] Cloudflare R2 uploads enabled.");
  } else {
    console.warn(
      `[upload] WARNING: R2 is not fully configured. Uploads are being stored in ${UPLOADS_DIR}. If this path is not on persistent storage, uploaded images will be lost on deploy/restart.`
    );
  }
}

function buildStorageName(originalName: string): string {
  const ext = path.extname(originalName) || ".jpg";
  const safeName = (originalName || "image")
    .replace(path.extname(originalName) || "", "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 50);
  return `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}${ext}`;
}

function buildR2Endpoint(): string {
  if (R2_ENDPOINT) return R2_ENDPOINT;
  if (!R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID is required when R2_ENDPOINT is not set.");
  }
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

async function getR2Client(): Promise<R2ClientLike> {
  if (!hasR2Credentials) {
    throw new Error("Cloudflare R2 credentials are missing.");
  }
  if (!r2Client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    r2Client = new S3Client({
      region: "auto",
      endpoint: buildR2Endpoint(),
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return r2Client as R2ClientLike;
}

function resolveR2Key(filename: string): string {
  const prefix = (R2_KEY_PREFIX ?? "").replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${filename}` : filename;
}

function resolveR2PublicUrl(key: string): string {
  if (!R2_PUBLIC_BASE_URL) {
    throw new Error("R2_PUBLIC_BASE_URL is required when using Cloudflare R2 uploads.");
  }
  const base = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/${encodedKey}`;
}

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  },
});

export async function persistUploadedImage(file: Express.Multer.File): Promise<string> {
  if (!file || !file.buffer?.length) {
    throw new Error("No image file provided");
  }

  const filename = buildStorageName(file.originalname || "image.jpg");

  if (R2_UPLOADS_ENABLED) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const key = resolveR2Key(filename);
    const client = await getR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
      })
    );

    return resolveR2PublicUrl(key);
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  await writeFile(filePath, file.buffer);
  return `/uploads/${filename}`;
}
