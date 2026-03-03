import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ItemDetail } from "./item-detail";

export default async function InventoryItemPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    redirect("/dashboard");
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
    include: {
      history: {
        include: {
          user: { select: { name: true } },
          project: {
            select: {
              id: true,
              property: { select: { address: true, city: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      projectItems: {
        include: {
          project: {
            include: {
              property: { select: { address: true, city: true } },
              client: { select: { agentName: true, companyName: true } },
            },
          },
        },
        orderBy: { checkedOutAt: "desc" },
        take: 10,
      },
    },
  });

  if (!item) {
    notFound();
  }

  const canWrite = hasPermission(session.user.role, "inventory:write");

  return (
    <ItemDetail
      item={JSON.parse(JSON.stringify(item))}
      canWrite={canWrite}
    />
  );
}
