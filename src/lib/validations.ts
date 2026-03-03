import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "OFFICE", "WAREHOUSE", "CREW"]),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "OFFICE", "WAREHOUSE", "CREW"]).optional(),
  phone: z.string().optional(),
  active: z.boolean().optional(),
});

export const createInventoryItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  color: z.string().optional(),
  styleTags: z.array(z.string()).optional(),
  purchaseCost: z.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  replacementValue: z.number().min(0).optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "NEEDS_REPAIR", "RETIRED"]).optional(),
  notes: z.string().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({
  status: z.enum(["AVAILABLE", "STAGED", "IN_TRANSIT", "MAINTENANCE", "RETIRED"]).optional(),
  currentLocation: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
