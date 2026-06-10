"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Tags, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const t = useTranslations("nav");
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="size-7">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials || "?"}</AvatarFallback>
            </Avatar>
            <span className="max-w-32 truncate text-sm">{displayName}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/app/profile" />}>
          <User />
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/app/event-types" />}>
          <Tags />
          {t("eventTypes")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
