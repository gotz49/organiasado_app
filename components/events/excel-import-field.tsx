"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseEventImport } from "@/lib/excel/import";
import { downloadImportTemplate } from "@/lib/excel/template";
import type { ImportResult } from "@/lib/excel/types";

export function ExcelImportField({
  importResult,
  onImport,
}: {
  importResult: ImportResult | null;
  onImport: (result: ImportResult | null) => void;
}) {
  const t = useTranslations("excel");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    onImport(parseEventImport(buffer));
  };

  return (
    <div className="grid gap-2 rounded-lg border border-dashed p-4">
      <Label>{t("importTitle")}</Label>
      <p className="text-xs text-muted-foreground">{t("importHint")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <FileSpreadsheet />
          {t("chooseFile")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => downloadImportTemplate(t)}
        >
          <Download />
          {t("downloadTemplate")}
        </Button>
      </div>

      {importResult && (
        <div className="mt-1 flex items-start justify-between gap-2 rounded-md bg-muted p-3 text-sm">
          <div className="grid gap-1">
            <span>
              {t("parsedSummary", {
                participants: importResult.participants.length,
                items: importResult.items.length,
              })}
            </span>
            {importResult.errors.length > 0 && (
              <span className="text-destructive">
                {t("parseErrors", { count: importResult.errors.length })}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onImport(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}
