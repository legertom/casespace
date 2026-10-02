"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "./actions";
import {
  backupStorageConfigured,
  saveBackupToStorage,
} from "./backup-storage";
import { failure, requireAdminActor } from "./guards";

/**
 * Take a backup and store it now, without waiting for the daily job. The same
 * thing the job does, with a person's name on it.
 */
export async function saveBackupNowAction(): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  if (!backupStorageConfigured()) {
    return { error: "Backup storage isn't set up, so there is nowhere to save one." };
  }
  try {
    const stored = await saveBackupToStorage(gate.user.name);
    console.info(
      "backup stored",
      JSON.stringify({ ...stored, userId: gate.user.id }),
    );
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/backup");
  return {};
}
