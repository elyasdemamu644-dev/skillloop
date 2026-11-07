import fs from "fs";
import path from "path";
import type { Request } from "express";
import multer from "multer";
import { ApiError } from "../middleware/error.middleware";

// Materials are stored under backend/uploads/materials. They are never served
// by a public static mount — every download goes through the authenticated
// /api/materials/:id/file/:file endpoint that checks ownership/purchase.
export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
export const MATERIALS_DIR = path.join(UPLOADS_ROOT, "materials");

fs.mkdirSync(MATERIALS_DIR, { recursive: true });

// A learning-resource marketplace only needs documents, media and archives.
// Without an allowlist, an account could use paid material uploads to
// distribute arbitrary executables or scripts through the platform.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".csv", ".json",
  ".xls", ".xlsx", ".ppt", ".pptx", ".epub",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".mp3", ".wav", ".mp4", ".mov", ".webm",
  ".zip",
]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(
      new ApiError(
        415,
        `Unsupported file type "${ext || "unknown"}". Upload documents, images, audio/video or a .zip archive.`
      )
    );
    return;
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MATERIALS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    const base = path.basename(file.originalname, ext).replace(/[^\w .-]/g, "").slice(0, 60) || "file";
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base}${ext}`);
  },
});

// Stored names are "<timestamp>_<rand>_<original>" — strip the unique prefix
// for the download filename so users get the original, readable name.
export function displayFileName(storedName: string): string {
  const parts = storedName.split("_");
  return parts.length > 2 ? parts.slice(2).join("_") : storedName;
}

export const uploadMaterials = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
});
