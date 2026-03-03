import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInventoryItemSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const condition = searchParams.get("condition") || "";
  const style = searchParams.get("style") || "";
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "24");

  const where: Prisma.InventoryItemWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (status) where.status = status as Prisma.EnumItemStatusFilter;
  if (condition) where.condition = condition as Prisma.EnumItemConditionFilter;
  if (style) where.styleTags = { has: style };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createInventoryItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { name, description, category, subcategory, length, width, height,
    color, styleTags, purchaseCost, purchaseDate, replacementValue, condition, notes } = parsed.data;

  // Generate next SKU
  const prefixes: Record<string, string> = {
    "Furniture": "FRN",
    "Art & Wall Decor": "ART",
    "Rugs/Pillows/Linens": "RPL",
    "Lighting/Plants/Accessories": "LPA",
  };
  const prefix = prefixes[category] || "ITM";

  const lastItem = await prisma.inventoryItem.findFirst({
    where: { sku: { startsWith: prefix } },
    orderBy: { sku: "desc" },
  });

  let nextNum = 1;
  if (lastItem) {
    const num = parseInt(lastItem.sku.split("-")[1]);
    if (!isNaN(num)) nextNum = num + 1;
  }
  const sku = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  const item = await prisma.inventoryItem.create({
    data: {
      sku,
      name,
      description: description || null,
      category,
      subcategory: subcategory || null,
      length: length || null,
      width: width || null,
      height: height || null,
      color: color || null,
      styleTags: styleTags || [],
      purchaseCost: purchaseCost || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      replacementValue: replacementValue || null,
      condition: condition || "GOOD",
      notes: notes || null,
    },
  });

  // Log activity
  await prisma.inventoryHistory.create({
    data: {
      itemId: item.id,
      action: "CREATED",
      toStatus: item.status,
      userId: session.user.id,
      notes: `Item created: ${item.name}`,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
