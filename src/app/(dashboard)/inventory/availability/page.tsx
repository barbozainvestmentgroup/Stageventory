import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AvailabilityView } from "./availability-view";

export default async function AvailabilityPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    redirect("/dashboard");
  }

  const [items, statusCounts] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { status: { not: "RETIRED" } },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        subcategory: true,
        status: true,
        condition: true,
        currentLocation: true,
        styleTags: true,
        color: true,
        photos: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { status: { not: "RETIRED" } },
    }),
  ]);

  const counts = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  );

  return (
    <AvailabilityView
      items={JSON.parse(JSON.stringify(items))}
      counts={counts}
    />
  );
}
