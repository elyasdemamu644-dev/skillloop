import fs from "fs";
import path from "path";
import multer from "multer";

// Materials are stored under backend/uploads/materials. They are never served
// by a public static mount — every download goes through the authenticated
// /api/materials/:id/file/:file endpoint that checks ownership/purchase.
export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
export const MATERIALS_DIR = path.join(UPLOADS_ROOT, "materials");

fs.mkdirSync(MATERIALS_DIR, { recursive: true });

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
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
});