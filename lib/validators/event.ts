import { z } from "zod";
import { CURRENCIES } from "@/lib/constants";

export const eventSchema = z.object({
  title: z.string().min(2, "titleTooShort").max(120, "tooLong"),
  description: z.string().max(2000, "tooLong").optional(),
  eventTypeId: z.uuid("required"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate"),
  eventTime: z
    .union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "invalidTime")])
    .optional(),
  locationText: z.string().max(300, "tooLong").optional(),
  currency: z.enum(CURRENCIES),
  rsvpDeadline: z.string().optional(),
});

export const eventTypeSchema = z.object({
  name: z.string().min(2, "nameTooShort").max(60, "nameTooLong"),
  icon: z.string().max(50).optional(),
});

export const presetItemSchema = z.object({
  itemName: z.string().min(1, "required").max(120, "tooLong"),
  unit: z.string().min(1, "required").max(20, "tooLong"),
  qtyPerAdultLow: z.coerce.number().min(0, "mustBePositive"),
  qtyPerAdultNormal: z.coerce.number().min(0, "mustBePositive"),
  qtyPerAdultHigh: z.coerce.number().min(0, "mustBePositive"),
  qtyPerChild: z.coerce.number().min(0, "mustBePositive"),
  isVegetarianSafe: z.boolean(),
  category: z.string().min(1, "required"),
});

export const eventItemSchema = z.object({
  itemName: z.string().min(1, "required").max(120, "tooLong"),
  unit: z.string().min(1, "required").max(20, "tooLong"),
  quantityNeeded: z.coerce.number().min(0, "mustBePositive"),
  category: z.string().min(1, "required"),
  notes: z.string().max(500, "tooLong").optional(),
});

export type EventInput = z.infer<typeof eventSchema>;
export type EventTypeInput = z.infer<typeof eventTypeSchema>;
export type PresetItemInput = z.infer<typeof presetItemSchema>;
export type EventItemInput = z.infer<typeof eventItemSchema>;
