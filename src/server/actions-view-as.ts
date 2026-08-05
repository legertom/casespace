"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/current-user";
import { VIEW_AS_COOKIE, VIEW_AS_ROLES, type ViewAsRole } from "@/lib/view-as";

/**
 * Start previewing the app as an AI Lead or a viewer. Gated on the *real*
 * role, so a preview can never be used to widen access — and an admin already
 * previewing can switch straight to the other role.
 */
export async function startViewAsAction(role: ViewAsRole): Promise<void> {
  const user = await requireUser();
  if (user.realRole !== "admin") return;
  if (!VIEW_AS_ROLES.includes(role)) return;

  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function stopViewAsAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
}
