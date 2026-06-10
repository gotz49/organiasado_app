import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Juntada
      </Link>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("updated")}</p>
      <div className="mt-6 grid gap-4 text-sm leading-relaxed">
        {(["p1", "p2", "p3", "p4", "p5", "p6"] as const).map((key) => (
          <p key={key}>{t(key)}</p>
        ))}
      </div>
    </main>
  );
}
