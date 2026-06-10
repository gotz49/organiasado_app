"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";
import { ITEM_CATEGORIES } from "@/lib/constants";
import type { EventItem, EventRow } from "@/types/database";
import { eventDataKey, type EventData } from "./use-event-data";

/**
 * Lista de compras para el organizador/co-organizador: cada ítem con su
 * cantidad TOTAL (quantity_needed ya es la suma) y un check de "comprado"
 * persistente, para usar mientras se hace la compra.
 */
export function ShoppingTab({
  event,
  data,
}: {
  event: EventRow;
  data: EventData;
}) {
  const t = useTranslations("shopping");
  const tCat = useTranslations("items.categories");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) });

  const togglePurchased = async (item: EventItem) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_items")
      .update({ purchased: !item.purchased })
      .eq("id", item.id);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    invalidate();
  };

  const items = data.items;
  const byCategory = new Map<string, EventItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const purchasedCount = items.filter((i) => i.purchased).length;

  return (
    <div className="grid gap-6">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShoppingCart className="size-4" />
        {t("hint")}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <Progress value={(purchasedCount / items.length) * 100} />
            <p className="text-xs text-muted-foreground">
              {t("progress", { done: purchasedCount, total: items.length })}
            </p>
          </div>

          {[...byCategory.entries()].map(([category, list]) => (
            <section key={category} className="grid gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {(ITEM_CATEGORIES as readonly string[]).includes(category)
                  ? tCat(category)
                  : category}
              </h3>
              <ul className="grid gap-1">
                {list.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <Checkbox
                      id={`buy-${item.id}`}
                      checked={item.purchased}
                      onCheckedChange={() => togglePurchased(item)}
                    />
                    <label
                      htmlFor={`buy-${item.id}`}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm",
                        item.purchased && "text-muted-foreground line-through"
                      )}
                    >
                      <span>{item.item_name}</span>
                      <span className="font-medium whitespace-nowrap">
                        {formatNumber(item.quantity_needed)} {item.unit}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
