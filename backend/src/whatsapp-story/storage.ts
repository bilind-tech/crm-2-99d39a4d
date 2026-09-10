import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const root = () => path.join(config.uploadsDir, "whatsapp-story");
const extension = (mime: string) => mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

export async function storeStoryImage(buffer: Buffer, mime: string) {
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const now = new Date();
  const rel = path.posix.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"), sha256.slice(0, 2), `${sha256}.${extension(mime)}`);
  const abs = path.join(root(), rel);
  if (!existsSync(path.dirname(abs))) mkdirSync(path.dirname(abs), { recursive: true, mode: 0o700 });
  if (!existsSync(abs)) await writeFile(abs, buffer, { mode: 0o600 });
  return { sha256, storagePath: rel, groesseBytes: buffer.length };
}
export const storyImageExists = (rel: string) => existsSync(path.join(root(), rel));
export const storyImageSize = (rel: string) => { try { return statSync(path.join(root(), rel)).size; } catch { return 0; } };
export const openStoryImage = (rel: string) => createReadStream(path.join(root(), rel));
export const deleteStoryImage = (rel: string) => { try { unlinkSync(path.join(root(), rel)); } catch { /* best effort */ } };
