import { z } from "zod";

export const guestSchema = z.object({
  eater_type: z.enum(["low", "normal", "high", "vegetarian", "child"]),
  dietary: z.string().max(200, "tooLong").optional(),
});

export const rsvpSchema = z.object({
  rsvpStatus: z.enum(["yes", "no", "maybe"]),
  eaterType: z.enum(["low", "normal", "high", "vegetarian", "child"]),
  guests: z.array(guestSchema).max(20, "tooManyGuests"),
  notes: z.string().max(500, "tooLong").optional(),
});

export const assignmentSchema = z.object({
  quantity: z.coerce.number().positive("mustBePositive"),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
export type GuestInput = z.infer<typeof guestSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
