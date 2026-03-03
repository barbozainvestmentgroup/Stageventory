import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const items = await prisma.inventoryItem.findMany({
    select: { category: true, subcategory: true, styleTags: true, color: true },
  });

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const subcategories: Record<string, string[]> = {};
  const allStyles = new Set<string>();
  const allColors = new Set<string>();

  for (const item of items) {
    if (item.category && item.subcategory) {
      if (!subcategories[item.category]) subcategories[item.category] = [];
      if (!subcategories[item.category].includes(item.subcategory)) {
        subcategories[item.category].push(item.subcategory);
      }
    }
    item.styleTags.forEach((t) => allStyles.add(t));
    if (item.color) allColors.add(item.color);
  }

  // Sort subcategories
  for (const key in subcategories) {
    subcategories[key].sort();
  }

  return NextResponse.json({
    categories,
    subcategories,
    styles: Array.from(allStyles).sort(),
    colors: Array.from(allColors).sort(),
  });
}
