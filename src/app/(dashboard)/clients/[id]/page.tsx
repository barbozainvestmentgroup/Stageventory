import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientDetail } from "./client-detail";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:read")) {
    redirect("/dashboard");
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id, active: true },
    include: {
      properties: {
        include: {
          projects: {
            include: {
              createdBy: { select: { name: true } },
              invoices: { select: { total: true, status: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      projects: {
        include: {
          property: { select: { address: true, city: true } },
          invoices: { select: { total: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const canWrite = hasPermission(session.user.role, "clients:write");

  return (
    <ClientDetail
      client={JSON.parse(JSON.stringify(client))}
      canWrite={canWrite}
    />
  );
}
