import { z } from "zod";

export const expenseSchema = z
  .object({
    description: z.string().min(1, "required").max(300, "tooLong"),
    amount: z.coerce.number().positive("mustBePositive"),
    paidBy: z.uuid("required"),
    itemId: z.union([z.literal(""), z.uuid()]).optional(),
    splitMode: z.enum(["equal", "custom"]),
    // participant_id -> monto (solo en modo custom)
    customShares: z.record(z.string(), z.coerce.number().min(0)).optional(),
    // participant_ids incluidos en división equitativa
    includedParticipants: z.array(z.string()).min(1, "selectAtLeastOne"),
  })
  .superRefine((data, ctx) => {
    if (data.splitMode === "custom") {
      const total = Object.values(data.customShares ?? {}).reduce(
        (a, b) => a + b,
        0
      );
      // tolerancia de centavos por redondeo
      if (Math.abs(total - data.amount) > 0.01) {
        ctx.addIssue({
          code: "custom",
          message: "sharesMustSumAmount",
          path: ["customShares"],
        });
      }
    }
  });

export const settlementSchema = z.object({
  toUserId: z.uuid("required"),
  amount: z.coerce.number().positive("mustBePositive"),
  note: z.string().max(300, "tooLong").optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
