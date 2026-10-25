import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { AdminDashboard } from "@/features/admin/components/dashboard";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-64 max-w-4xl" />}>
      <AdminGate path="/admin">
        <AdminDashboard />
      </AdminGate>
    </Suspense>
  );
}
