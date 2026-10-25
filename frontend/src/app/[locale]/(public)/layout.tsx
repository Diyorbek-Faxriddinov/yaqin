import { PublicShell } from "@/components/common/public-shell";

export default function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  return <PublicShell>{children}</PublicShell>;
}
