import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryList } from "./inventory-list";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    redirect("/dashboard");
  }

  const search = searchParams.search || "";
  const category = searchParams.category || "";
  const status = searchParams.status || "";
  const condition = searchParams.condition || "";
  const style = searchParams.style || "";
  const page = parseInt(searchParams.page || "1");
  const limit = 24;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (status) where.status = status;
  if (condition) where.condition = condition;
  if (style) where.styleTags = { has: style };

  const [items, total, catData] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      select: { category: true, styleTags: true },
    }),
  ]);

  const allCategories = Array.from(new Set(catData.map((c) => c.category))).sort();
  const allStyles = new Set<string>();
  catData.forEach((c) => c.styleTags.forEach((t) => allStyles.add(t)));

  const canWrite = hasPermission(session.user.role, "inventory:write");

  return (
    <InventoryList
      items={JSON.parse(JSON.stringify(items))}
      pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      filters={{
        search,
        category,
        status,
        condition,
        style,
        categories: allCategories,
        styles: Array.from(allStyles).sort(),
      }}
      canWrite={canWrite}
    />
  );
}
