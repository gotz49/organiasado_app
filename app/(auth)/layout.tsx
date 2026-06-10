import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Beef } from "lucide-react";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("landing");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-xl font-bold"
      >
        <Beef className="size-7 text-brand" />
        {t("appName")}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
