import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoicingPage } from "./invoicing-page";

export default async function InvoicingServerPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "invoices:read")) {
    redirect("/dashboard");
  }

  const [invoices, projects] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        project: {
          include: {
            property: {
              select: { id: true, address: true, city: true },
            },
            client: {
              select: { id: true, agentName: true, companyName: true },
            },
          },
        },
        payments: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        status: {
          in: ["CONSULTATION", "PROPOSAL", "CONTRACT", "SCHEDULED", "STAGED", "ACTIVE", "DESTAGE_SCHEDULED", "DESTAGED"],
        },
      },
      include: {
        property: {
          select: { id: true, address: true, city: true },
        },
        client: {
          select: { id: true, agentName: true, companyName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canWrite = hasPermission(session.user.role, "invoices:write");

  return (
    <InvoicingPage
      invoices={JSON.parse(JSON.stringify(invoices))}
      projects={JSON.parse(JSON.stringify(projects))}
      canWrite={canWrite}
    />
  );
}
