import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInventoryItemSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
    include: {
      history: {
        include: { user: { select: { name: true } }, project: { select: { id: true, property: { select: { address: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      projectItems: {
        include: { project: { include: { property: { select: { address: true, city: true } } } } },
        orderBy: { checkedOutAt: "desc" },
        take: 10,
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateInventoryItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { status, condition, currentLocation, purchaseDate, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest };
  if (status !== undefined) updateData.status = status;
  if (condition !== undefined) updateData.condition = condition;
  if (currentLocation !== undefined) updateData.currentLocation = currentLocation;
  if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;

  const item = await prisma.inventoryItem.update({
    where: { id: params.id },
    data: updateData,
  });

  // Log status/condition changes
  if (status && status !== existing.status) {
    await prisma.inventoryHistory.create({
      data: {
        itemId: item.id,
        action: "STATUS_CHANGE",
        fromStatus: existing.status,
        toStatus: status,
        userId: session.user.id,
        notes: `Status changed from ${existing.status} to ${status}`,
      },
    });
  }

  if (condition && condition !== existing.condition) {
    await prisma.inventoryHistory.create({
      data: {
        itemId: item.id,
        action: "CONDITION_CHANGE",
        fromStatus: existing.condition,
        toStatus: condition,
        userId: session.user.id,
        notes: `Condition changed from ${existing.condition} to ${condition}`,
      },
    });
  }

  return NextResponse.json(item);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
    include: { projectItems: { where: { checkedInAt: null } } },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.projectItems.length > 0) {
    return NextResponse.json(
      { error: "Item is currently assigned to active projects. Unassign it first." },
      { status: 400 }
    );
  }

  // Soft delete by retiring
  await prisma.inventoryItem.update({
    where: { id: params.id },
    data: { status: "RETIRED", condition: "RETIRED" },
  });

  await prisma.inventoryHistory.create({
    data: {
      itemId: params.id,
      action: "RETIRED",
      fromStatus: item.status,
      toStatus: "RETIRED",
      userId: session.user.id,
      notes: "Item retired",
    },
  });

  return NextResponse.json({ success: true });
}
