import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "reports:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch all data in parallel for performance
  const [
    invoices,
    payments,
    inventoryItems,
    projects,
    recentPayments,
  ] = await Promise.all([
    // All invoices for revenue calculations
    prisma.invoice.findMany({
      select: {
        id: true,
        amount: true,
        total: true,
        status: true,
        paidDate: true,
      },
    }),

    // All payments for total paid calculation
    prisma.payment.findMany({
      select: {
        amount: true,
      },
    }),

    // All inventory items for inventory stats
    prisma.inventoryItem.findMany({
      select: {
        id: true,
        status: true,
        replacementValue: true,
      },
    }),

    // All projects for project stats
    prisma.project.findMany({
      select: {
        id: true,
        status: true,
        totalPrice: true,
      },
    }),

    // Recent payments with invoice and project info
    prisma.payment.findMany({
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            project: {
              select: {
                id: true,
                status: true,
                property: {
                  select: {
                    address: true,
                    city: true,
                  },
                },
                client: {
                  select: {
                    agentName: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  // --- Revenue calculations ---
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Outstanding = total of invoices that are SENT, OVERDUE, or PARTIAL minus what's been paid
  const outstandingInvoices = invoices.filter((inv) =>
    ["SENT", "OVERDUE", "PARTIAL"].includes(inv.status)
  );
  const outstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.total,
    0
  );

  // Average project value from projects that have a totalPrice set
  const projectsWithPrice = projects.filter((p) => p.totalPrice != null);
  const averageProjectValue =
    projectsWithPrice.length > 0
      ? projectsWithPrice.reduce(
          (sum, p) => sum + (p.totalPrice as number),
          0
        ) / projectsWithPrice.length
      : 0;

  // --- Inventory calculations ---
  const inventoryTotal = inventoryItems.length;
  const inventoryAvailable = inventoryItems.filter(
    (i) => i.status === "AVAILABLE"
  ).length;
  const inventoryStaged = inventoryItems.filter(
    (i) => i.status === "STAGED"
  ).length;
  const inventoryMaintenance = inventoryItems.filter(
    (i) => i.status === "MAINTENANCE"
  ).length;
  const inventoryRetired = inventoryItems.filter(
    (i) => i.status === "RETIRED"
  ).length;

  // Utilization rate: staged / (total - retired - maintenance)
  const activeInventory =
    inventoryTotal - inventoryRetired - inventoryMaintenance;
  const utilizationRate =
    activeInventory > 0
      ? Math.round((inventoryStaged / activeInventory) * 100)
      : 0;

  const totalValue = inventoryItems.reduce(
    (sum, i) => sum + (i.replacementValue || 0),
    0
  );

  // --- Project calculations ---
  const projectTotal = projects.length;
  const byStatus: Record<string, number> = {};
  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }

  // --- Format recent payments ---
  const formattedPayments = recentPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    date: p.date.toISOString(),
    reference: p.reference,
    invoice: {
      id: p.invoice.id,
      invoiceNumber: p.invoice.invoiceNumber,
      total: p.invoice.total,
      status: p.invoice.status,
    },
    project: p.invoice.project
      ? {
          id: p.invoice.project.id,
          propertyAddress: `${p.invoice.project.property.address}, ${p.invoice.project.property.city}`,
          clientName: p.invoice.project.client.agentName,
          companyName: p.invoice.project.client.companyName,
        }
      : null,
  }));

  return NextResponse.json({
    revenue: {
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      averageProjectValue: Math.round(averageProjectValue * 100) / 100,
    },
    inventory: {
      total: inventoryTotal,
      available: inventoryAvailable,
      staged: inventoryStaged,
      maintenance: inventoryMaintenance,
      retired: inventoryRetired,
      utilizationRate,
      totalValue: Math.round(totalValue * 100) / 100,
    },
    projects: {
      total: projectTotal,
      byStatus,
    },
    recentPayments: formattedPayments,
  });
}
