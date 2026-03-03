import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      client: true,
      projectItems: {
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              photos: true,
              status: true,
              condition: true,
              replacementValue: true,
              currentLocation: true,
            },
          },
        },
        orderBy: { checkedOutAt: "desc" },
      },
      proposals: {
        orderBy: { createdAt: "desc" },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
      },
      scheduleEvents: {
        include: {
          crew: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { status, stageDate, destageDate, pricingType, totalPrice, notes, propertyId, clientId } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (stageDate !== undefined) updateData.stageDate = stageDate ? new Date(stageDate) : null;
  if (destageDate !== undefined) updateData.destageDate = destageDate ? new Date(destageDate) : null;
  if (pricingType !== undefined) updateData.pricingType = pricingType;
  if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
  if (notes !== undefined) updateData.notes = notes;
  if (propertyId !== undefined) updateData.propertyId = propertyId;
  if (clientId !== undefined) updateData.clientId = clientId;

  const project = await prisma.project.update({
    where: { id: params.id },
    data: updateData,
    include: {
      property: {
        select: { id: true, address: true, city: true },
      },
      client: {
        select: { id: true, agentName: true, companyName: true },
      },
    },
  });

  // Log status changes
  if (status && status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        entityType: "project",
        entityId: project.id,
        action: "STATUS_CHANGE",
        details: {
          fromStatus: existing.status,
          toStatus: status,
        },
      },
    });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Soft delete by setting status to CLOSED
  await prisma.project.update({
    where: { id: params.id },
    data: { status: "CLOSED" },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "project",
      entityId: params.id,
      action: "CLOSED",
      details: {
        fromStatus: project.status,
        toStatus: "CLOSED",
      },
    },
  });

  return NextResponse.json({ success: true });
}
