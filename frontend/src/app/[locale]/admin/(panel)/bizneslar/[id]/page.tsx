import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { parseTab } from "@/features/admin/admin-params";
import { BusinessEditor } from "@/features/admin/components/business-editor";

const UUID = /^[0-9a-f-]{36}$/i;

async function EditorContent({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/bizneslar/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const raw = (await searchParams).bolim;
  return <BusinessEditor id={id} initialTab={parseTab(Array.isArray(raw) ? raw[0] : raw)} />;
}

export default function EditBusinessPage(props: PageProps<"/[locale]/admin/bizneslar/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/bizneslar" permission="business.view">
        <EditorContent {...props} />
      </AdminGate>
    </Suspense>
  );
}
