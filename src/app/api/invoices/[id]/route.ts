import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";

const invoiceIncludes = {
  project: {
    include: {
      property: {
        select: { id: true, address: true, city: true },
      },
      client: {
        select: { id: true, agentName: true, companyName: true, email: true, phone: true },
      },
    },
  },
  payments: {
    orderBy: { date: "desc" as const },
  },
};

const VALID_TRANSITIONS: Record<string, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "PARTIAL", "OVERDUE", "VOID"],
  OVERDUE: ["PAID", "PARTIAL", "VOID"],
  PARTIAL: ["PAID", "VOID"],
  PAID: [],
  VOID: [],
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "invoices:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: invoiceIncludes,
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "invoices:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.invoice.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const body = await req.json();
  const { lineItems, tax, dueDate, status, payment } = body as {
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
    tax?: number;
    dueDate?: string;
    status?: InvoiceStatus;
    payment?: {
      amount: number;
      method: string;
      reference?: string;
      date?: string;
    };
  };

  const updateData: Record<string, unknown> = {};

  // Only allow editing details on DRAFT invoices
  if (existing.status === "DRAFT") {
    if (lineItems !== undefined) {
      const amount = lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const taxAmount = tax !== undefined ? tax : existing.tax;
      updateData.lineItems = lineItems;
      updateData.amount = amount;
      updateData.tax = taxAmount;
      updateData.total = amount + taxAmount;
    } else if (tax !== undefined) {
      updateData.tax = tax;
      updateData.total = existing.amount + tax;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }
  }

  // Handle status transitions
  if (status && status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 400 }
      );
    }

    updateData.status = status;

    if (status === "PAID") {
      updateData.paidDate = new Date();

      if (payment) {
        await prisma.payment.create({
          data: {
            invoiceId: params.id,
            amount: payment.amount,
            method: payment.method || null,
            reference: payment.reference || null,
            date: payment.date ? new Date(payment.date) : new Date(),
          },
        });
      }

      const project = await prisma.project.findUnique({
        where: { id: existing.projectId },
      });
      if (project && project.status !== "CLOSED") {
        await prisma.project.update({
          where: { id: existing.projectId },
          data: { status: "INVOICED" },
        });
      }
    }
  }

  // Record a standalone payment (without status change)
  if (payment && !status) {
    await prisma.payment.create({
      data: {
        invoiceId: params.id,
        amount: payment.amount,
        method: payment.method || null,
        reference: payment.reference || null,
        date: payment.date ? new Date(payment.date) : new Date(),
      },
    });
  }

  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: updateData,
    include: invoiceIncludes,
  });

  if (status && status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        entityType: "invoice",
        entityId: invoice.id,
        action: "STATUS_CHANGE",
        details: {
          fromStatus: existing.status,
          toStatus: status,
          invoiceNumber: invoice.invoiceNumber,
        },
      },
    });
  }

  if (payment) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        entityType: "invoice",
        entityId: invoice.id,
        action: "PAYMENT_RECORDED",
        details: {
          amount: payment.amount,
          method: payment.method,
          invoiceNumber: invoice.invoiceNumber,
        },
      },
    });
  }

  return NextResponse.json(invoice);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "invoices:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT invoices can be deleted" },
      { status: 400 }
    );
  }

  await prisma.invoice.delete({
    where: { id: params.id },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "invoice",
      entityId: params.id,
      action: "DELETED",
      details: {
        invoiceNumber: invoice.invoiceNumber,
      },
    },
  });

  return NextResponse.json({ success: true });
}
