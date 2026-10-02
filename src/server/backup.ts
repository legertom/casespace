import "server-only";
import { getDb } from "@/db/client";
import { currentSchemaTag, readBackupTables } from "@/db/backup";
import {
  backupFilename,
  buildBackupFiles,
  zipBackupFiles,
  type BackupManifest,
} from "@/lib/backup";

/** A backup of the database as it is now. Admin-only — the caller checks. */
export async function createBackup(createdBy: string): Promise<{
  bytes: Uint8Array;
  filename: string;
  manifest: BackupManifest;
}> {
  const createdAt = new Date();
  const tables = await readBackupTables(getDb());
  const { manifest, files } = buildBackupFiles(tables, {
    createdAt,
    createdBy,
    schema: currentSchemaTag(),
  });
  return {
    bytes: zipBackupFiles(files, createdAt),
    filename: backupFilename(createdAt),
    manifest,
  };
}
