import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Beef, Calculator, Receipt, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const features = [
    { icon: Calculator, key: "calculator" },
    { icon: Share2, key: "invites" },
    { icon: Beef, key: "items" },
    { icon: Receipt, key: "expenses" },
  ] as const;

  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 text-lg font-bold">
            <Beef className="size-6 text-primary" />
            {t("appName")}
          </span>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button render={<Link href="/app" />}>{t("goToApp")}</Button>
            ) : (
              <>
                <Button variant="ghost" render={<Link href="/login" />}>
                  {t("login")}
                </Button>
                <Button render={<Link href="/register" />}>
                  {t("register")}
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {t("heroSubtitle")}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            size="lg"
            render={<Link href={user ? "/app/event/new" : "/register"} />}
          >
            {t("ctaCreate")}
          </Button>
          {!user && (
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              {t("login")}
            </Button>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, key }) => (
          <Card key={key}>
            <CardHeader>
              <Icon className="size-8 text-primary" />
              <CardTitle className="text-base">
                {t(`features.${key}.title`)}
              </CardTitle>
              <CardDescription>
                {t(`features.${key}.description`)}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>{t("appName")}</span>
          <nav className="flex gap-4">
            <Link href="/terms" className="hover:underline">
              {t("terms")}
            </Link>
            <Link href="/privacy" className="hover:underline">
              {t("privacy")}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
