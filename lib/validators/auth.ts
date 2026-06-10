import { z } from "zod";

// Los mensajes son claves i18n del namespace "errors";
// se traducen al renderizar: t(error.message)

export const loginSchema = z.object({
  email: z.email("invalidEmail"),
  password: z.string().min(1, "required"),
});

export const registerSchema = z
  .object({
    displayName: z.string().min(2, "nameTooShort").max(80, "nameTooLong"),
    email: z.email("invalidEmail"),
    password: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, "mustAcceptTerms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDontMatch",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("invalidEmail"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDontMatch",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  displayName: z.string().min(2, "nameTooShort").max(80, "nameTooLong"),
  avatarUrl: z
    .union([z.literal(""), z.url("invalidUrl")])
    .optional(),
  defaultEaterType: z.enum(["low", "normal", "high"]),
  vegetarian: z.boolean(),
  celiac: z.boolean(),
  dietaryNotes: z.string().max(500, "tooLong").optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
