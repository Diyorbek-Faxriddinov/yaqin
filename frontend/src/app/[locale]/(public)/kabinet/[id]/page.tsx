import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { parseCabinetTab } from "@/features/cabinet/cabinet-params";
import { OwnerEditor } from "@/features/cabinet/components/owner-editor";

const UUID = /^[0-9a-f-]{36}$/i;

async function EditorContent({ params, searchParams }: PageProps<"/[locale]/kabinet/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const raw = (await searchParams).bolim;
  return (
    <AuthGate path={`/kabinet/${id}`}>
      <OwnerEditor id={id} initialTab={parseCabinetTab(Array.isArray(raw) ? raw[0] : raw)} />
    </AuthGate>
  );
}

export default function OwnerBusinessPage(props: PageProps<"/[locale]/kabinet/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <EditorContent {...props} />
    </Suspense>
  );
}
