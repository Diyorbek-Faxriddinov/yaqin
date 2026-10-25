import type { AdminPermission } from "@/lib/api/types";
import { requireAdmin } from "../server";

/** Admin sahifa qismi: sessiya va (berilgan bo'lsa) ruxsat serverda tekshiriladi. Suspense ichida. */
export async function AdminGate({
  path,
  permission,
  children,
}: {
  path: string;
  permission?: AdminPermission;
  children: React.ReactNode;
}) {
  await requireAdmin(path, permission);
  return children;
}
