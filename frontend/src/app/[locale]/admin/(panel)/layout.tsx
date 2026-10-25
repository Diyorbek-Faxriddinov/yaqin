import { AdminShell } from "@/features/admin/components/admin-shell";

export default function AdminPanelLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
