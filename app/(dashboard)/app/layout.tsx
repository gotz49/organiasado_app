import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Beef } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/shared/user-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { GuestBanner } from "@/components/shared/guest-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("landing");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2 font-bold">
            <Beef className="size-6 text-brand" />
            {t("appName")}
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              displayName={profile?.display_name ?? user.email ?? ""}
              avatarUrl={profile?.avatar_url}
            />
          </div>
        </div>
      </header>
      {profile?.is_anonymous && (
        <GuestBanner displayName={profile.display_name} />
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
