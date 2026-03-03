import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const projectItems = await prisma.projectItem.findMany({
    where: { projectId: params.id },
    include: {
      item: {
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          subcategory: true,
          photos: true,
          status: true,
          condition: true,
          replacementValue: true,
          currentLocation: true,
        },
      },
    },
    orderBy: { checkedOutAt: "desc" },
  });

  return NextResponse.json({ projectItems });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      property: { select: { address: true, city: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const { itemIds, roomAssignment } = body as {
    itemIds: string[];
    roomAssignment?: string;
  };

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json(
      { error: "itemIds is required and must be a non-empty array" },
      { status: 400 }
    );
  }

  // Verify all items exist and are available
  const items = await prisma.inventoryItem.findMany({
    where: {
      id: { in: itemIds },
      status: "AVAILABLE",
    },
    select: { id: true, name: true, status: true },
  });

  if (items.length !== itemIds.length) {
    const foundIds = new Set(items.map((i) => i.id));
    const missing = itemIds.filter((id) => !foundIds.has(id));
    return NextResponse.json(
      {
        error: `Some items are not available or do not exist: ${missing.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const locationLabel = `${project.property.address}, ${project.property.city}`;
  const now = new Date();

  // Create project items and update inventory status in a transaction
  await prisma.$transaction(async (tx) => {
    for (const itemId of itemIds) {
      await tx.projectItem.create({
        data: {
          projectId: params.id,
          itemId,
          roomAssignment: roomAssignment || null,
          checkedOutAt: now,
        },
      });

      // Update item status to STAGED and location to property address
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          status: "STAGED",
          currentLocation: locationLabel,
        },
      });

      // Log inventory history
      await tx.inventoryHistory.create({
        data: {
          itemId,
          action: "STAGED",
          fromStatus: "AVAILABLE",
          toStatus: "STAGED",
          projectId: params.id,
          userId: session.user.id,
          notes: `Assigned to project at ${locationLabel}${roomAssignment ? ` (${roomAssignment})` : ""}`,
        },
      });
    }
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "project",
      entityId: params.id,
      action: "ITEMS_ADDED",
      details: {
        itemCount: itemIds.length,
        roomAssignment: roomAssignment || null,
      },
    },
  });

  return NextResponse.json(
    { success: true, addedCount: itemIds.length },
    { status: 201 }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { projectItemId } = body as { projectItemId: string };

  if (!projectItemId) {
    return NextResponse.json(
      { error: "projectItemId is required" },
      { status: 400 }
    );
  }

  const projectItem = await prisma.projectItem.findUnique({
    where: { id: projectItemId },
    include: {
      item: { select: { id: true, name: true, status: true } },
    },
  });

  if (!projectItem) {
    return NextResponse.json(
      { error: "Project item not found" },
      { status: 404 }
    );
  }

  if (projectItem.projectId !== params.id) {
    return NextResponse.json(
      { error: "Project item does not belong to this project" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Remove the project item
    await tx.projectItem.delete({
      where: { id: projectItemId },
    });

    // Update item status back to AVAILABLE
    await tx.inventoryItem.update({
      where: { id: projectItem.itemId },
      data: {
        status: "AVAILABLE",
        currentLocation: "Warehouse",
      },
    });

    // Log inventory history
    await tx.inventoryHistory.create({
      data: {
        itemId: projectItem.itemId,
        action: "RETURNED",
        fromStatus: projectItem.item.status,
        toStatus: "AVAILABLE",
        projectId: params.id,
        userId: session.user.id,
        notes: "Removed from project and returned to warehouse",
      },
    });
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "project",
      entityId: params.id,
      action: "ITEM_REMOVED",
      details: {
        itemId: projectItem.itemId,
        itemName: projectItem.item.name,
      },
    },
  });

  return NextResponse.json({ success: true });
}
