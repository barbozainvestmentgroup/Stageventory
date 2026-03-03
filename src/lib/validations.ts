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

export const createClientSchema = z.object({
  companyName: z.string().optional(),
  agentName: z.string().min(2, "Agent name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  brokerage: z.string().optional(),
  notes: z.string().optional(),
  preferredStyle: z.string().optional(),
  rating: z.number().int().min(0).max(5).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const createPropertySchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().default("FL"),
  zip: z.string().min(5, "ZIP code is required"),
  sqft: z.number().int().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  listingPrice: z.number().min(0).optional(),
  mlsNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const createProjectSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  clientId: z.string().min(1, "Client is required"),
  status: z.enum(["CONSULTATION", "PROPOSAL", "CONTRACT", "SCHEDULED", "STAGED", "ACTIVE", "DESTAGE_SCHEDULED", "DESTAGED", "INVOICED", "CLOSED"]).optional(),
  stageDate: z.string().optional(),
  destageDate: z.string().optional(),
  pricingType: z.enum(["MONTHLY_RENTAL", "FLAT_FEE"]).optional(),
  totalPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
