import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PackagesList } from "./packages-list";

export default async function PackagesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    redirect("/dashboard");
  }

  const packages = await prisma.roomPackage.findMany({
    include: {
      items: {
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              photos: true,
              status: true,
              category: true,
              replacementValue: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const canWrite = hasPermission(session.user.role, "inventory:write");

  return (
    <PackagesList
      packages={JSON.parse(JSON.stringify(packages))}
      canWrite={canWrite}
    />
  );
}
