import { ProfileNav } from "@/features/auth/components/profile-nav";

export default function ProfileLayout({ children }: LayoutProps<"/[locale]/profil">) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <ProfileNav />
      {children}
    </div>
  );
}
