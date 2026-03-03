import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientsList } from "./clients-list";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:read")) {
    redirect("/dashboard");
  }

  const clients = await prisma.client.findMany({
    where: { active: true },
    include: {
      _count: {
        select: {
          properties: true,
          projects: true,
        },
      },
      projects: {
        select: {
          totalPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const clientsData = clients.map((client) => {
    const totalRevenue = client.projects.reduce(
      (sum, p) => sum + (p.totalPrice || 0),
      0
    );
    const { projects, ...rest } = client;
    return {
      ...rest,
      totalRevenue,
    };
  });

  const canWrite = hasPermission(session.user.role, "clients:write");

  return (
    <ClientsList
      clients={JSON.parse(JSON.stringify(clientsData))}
      canWrite={canWrite}
    />
  );
}
