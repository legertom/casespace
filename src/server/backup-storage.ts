import "server-only";
import { get, list, put } from "@vercel/blob";
import {
  STORED_BACKUP_PREFIX,
  isStoredBackupName,
  storedBackupPath,
  storedBackupTakenAt,
} from "@/lib/backup";
import { createBackup } from "./backup";

/**
 * Backups kept outside the database, in a private Vercel Blob store. The
 * daily job writes here; the backup page lists and serves what is here.
 *
 * Private, always: a backup holds every status note and sign-in address, and
 * a public blob URL is readable by anyone who has it. Nothing here hands out
 * a blob URL — downloads go back through the app, behind the admin check.
 *
 * Nothing here deletes, either. A day's backup is tens of kilobytes; a job
 * that prunes old ones is a job that can prune the one you needed.
 */

export function backupStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export interface StoredBackup {
  name: string;
  /** When it was taken — from the name, which the job set. */
  takenAt: Date;
  size: number;
}

/** Take a backup now and store it. Returns what was stored. */
export async function saveBackupToStorage(createdBy: string): Promise<{
  name: string;
  size: number;
  useCases: number;
}> {
  const { bytes, filename, manifest } = await createBackup(createdBy);
  await put(storedBackupPath(filename), Buffer.from(bytes), {
    access: "private",
    contentType: "application/zip",
    // The name is the minute it was taken. Two in one minute is the same
    // backup twice; the second replaces the first rather than failing.
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return {
    name: filename,
    size: bytes.byteLength,
    useCases: manifest.tables.find((t) => t.name === "use_cases")?.rows ?? 0,
  };
}

/** Every stored backup, newest first. */
export async function listStoredBackups(): Promise<StoredBackup[]> {
  const found: StoredBackup[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: STORED_BACKUP_PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const name = blob.pathname.slice(STORED_BACKUP_PREFIX.length);
      const takenAt = storedBackupTakenAt(name);
      if (takenAt) found.push({ name, takenAt, size: blob.size });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
}

/** A stored backup's bytes, or null if there is no such backup. */
export async function openStoredBackup(
  name: string,
): Promise<ReadableStream<Uint8Array> | null> {
  if (!isStoredBackupName(name)) return null;
  const result = await get(storedBackupPath(name), {
    access: "private",
    useCache: false,
  });
  return result?.stream ?? null;
}
