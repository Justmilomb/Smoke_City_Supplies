import path from "path";
import fs from "fs";
import multer from "multer";

// Use process.cwd() so uploads work when server is bundled as CJS (dist/index.cjs).
// Set UPLOADS_DIR to a persistent mount (for example Render Disk) in production.
const configuredUploadsDir = process.env.UPLOADS_DIR?.trim();
export const UPLOADS_DIR = configuredUploadsDir
  ? path.resolve(configuredUploadsDir)
  : path.join(process.cwd(), "uploads");

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {
  // directory may already exist
}

if (process.env.NODE_ENV === "production") {
  console.warn(
    `[upload] WARNING: Uploads are being stored in ${UPLOADS_DIR}. If this path is not on persistent storage, uploaded images will be lost on deploy/restart.`
  );
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safeName = (file.originalname || "image")
      .replace(path.extname(file.originalname) || "", "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    const name = `${Date.now()}-${safeName}${ext}`;
    cb(null, name);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  },
});
