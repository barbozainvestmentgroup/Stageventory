import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, InvoiceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "invoices:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const where: Prisma.InvoiceWhereInput = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (status) {
    where.status = status as InvoiceStatus;
  }

  const invoices = await prisma.invoice.findMany({
    where,
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
  });

  return NextResponse.json({ invoices });
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  let nextSeq = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "invoices:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { projectId, lineItems, tax, dueDate } = body as {
    projectId: string;
    lineItems: LineItem[];
    tax?: number;
    dueDate?: string;
  };

  if (!projectId || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json(
      { error: "projectId and lineItems (non-empty array) are required" },
      { status: 400 }
    );
  }

  for (const item of lineItems) {
    if (!item.description || item.quantity == null || item.unitPrice == null) {
      return NextResponse.json(
        { error: "Each line item must have description, quantity, and unitPrice" },
        { status: 400 }
      );
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const amount = lineItems.reduce(
    (sum: number, item: LineItem) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = tax ?? 0;
  const total = amount + taxAmount;

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      projectId,
      invoiceNumber,
      lineItems: lineItems as unknown as Prisma.JsonArray,
      amount,
      tax: taxAmount,
      total,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
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
      payments: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "invoice",
      entityId: invoice.id,
      action: "CREATED",
      details: {
        invoiceNumber,
        total,
        projectId,
      },
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
