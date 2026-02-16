import path from "path";
import fs from "fs";
import multer from "multer";
import { randomBytes } from "crypto";

export type PreparedUpload = {
  filename: string;
  mimeType: string;
  content: Buffer;
  sizeBytes: number;
};

const configuredUploadsDir = process.env.UPLOADS_DIR?.trim();
export const UPLOADS_DIR = configuredUploadsDir
  ? path.resolve(configuredUploadsDir)
  : path.join(process.cwd(), "uploads");

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {
  // directory may already exist
}

function buildStorageName(originalName: string): string {
  const ext = path.extname(originalName) || ".jpg";
  const safeName = (originalName || "image")
    .replace(path.extname(originalName) || "", "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 50);
  return `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}${ext}`;
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

export function prepareUploadedImage(file: Express.Multer.File): PreparedUpload {
  if (!file || !file.buffer?.length) {
    throw new Error("No image file provided");
  }

  const filename = buildStorageName(file.originalname || "image.jpg");
  return {
    filename,
    mimeType: file.mimetype || "application/octet-stream",
    content: file.buffer,
    sizeBytes: file.buffer.length,
  };
}
