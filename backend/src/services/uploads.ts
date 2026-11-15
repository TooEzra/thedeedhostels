import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "../config";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const UPLOAD_NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Identify the real image type from magic bytes (don't trust the client's MIME/extension). */
function sniff(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export async function saveTicketPhoto(buf: Buffer): Promise<{ name: string } | { error: string }> {
  if (buf.length > MAX_PHOTO_BYTES) return { error: "Photo is too large (max 5MB)." };
  const ext = sniff(buf);
  if (!ext) return { error: "Photo must be a JPG, PNG or WebP image." };
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await mkdir(config.uploadDir, { recursive: true });
  await writeFile(path.join(config.uploadDir, name), buf);
  return { name };
}

export async function deleteUpload(name: string | undefined): Promise<void> {
  if (!name || !UPLOAD_NAME_RE.test(name)) return;
  await unlink(path.join(config.uploadDir, name)).catch(() => undefined);
}

export async function readUpload(name: string): Promise<{ buf: Buffer; type: string } | null> {
  if (!UPLOAD_NAME_RE.test(name)) return null; // also blocks path traversal
  try {
    const buf = await readFile(path.join(config.uploadDir, name));
    return { buf, type: MIME[name.split(".")[1]] };
  } catch {
    return null;
  }
}
