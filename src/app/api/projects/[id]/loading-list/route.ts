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
              subcategory: true,
              length: true,
              width: true,
              height: true,
              color: true,
              condition: true,
              currentLocation: true,
              photos: true,
              replacementValue: true,
              status: true,
            },
          },
        },
        orderBy: { checkedOutAt: "desc" },
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

  // Build dimensions string from individual length/width/height fields
  function formatDimensions(item: {
    length: number | null;
    width: number | null;
    height: number | null;
  }): string | null {
    const parts: string[] = [];
    if (item.length != null) parts.push(`${item.length}L`);
    if (item.width != null) parts.push(`${item.width}W`);
    if (item.height != null) parts.push(`${item.height}H`);
    return parts.length > 0 ? parts.join(" x ") : null;
  }

  // Estimate weight from dimensions (cubic inches / 100 as rough lbs estimate)
  function estimateWeight(item: {
    length: number | null;
    width: number | null;
    height: number | null;
  }): number | null {
    if (item.length != null && item.width != null && item.height != null) {
      return Math.round((item.length * item.width * item.height) / 100);
    }
    return null;
  }

  // Group items by room assignment
  const itemsByRoom: Record<
    string,
    Array<{
      sku: string;
      name: string;
      category: string;
      subcategory: string | null;
      dimensions: string | null;
      weight: number | null;
      condition: string;
      currentLocation: string | null;
      photo: string | null;
      color: string | null;
      replacementValue: number | null;
    }>
  > = {};

  let totalWeight = 0;

  for (const pi of project.projectItems) {
    const room = pi.roomAssignment || "Unassigned";
    if (!itemsByRoom[room]) {
      itemsByRoom[room] = [];
    }

    const dimensions = formatDimensions(pi.item);
    const weight = estimateWeight(pi.item);
    if (weight != null) {
      totalWeight += weight;
    }

    itemsByRoom[room].push({
      sku: pi.item.sku,
      name: pi.item.name,
      category: pi.item.category,
      subcategory: pi.item.subcategory,
      dimensions,
      weight,
      condition: pi.item.condition,
      currentLocation: pi.item.currentLocation,
      photo: pi.item.photos.length > 0 ? pi.item.photos[0] : null,
      color: pi.item.color,
      replacementValue: pi.item.replacementValue,
    });
  }

  // Find the next upcoming schedule event
  const now = new Date();
  const upcomingEvent = project.scheduleEvents.find(
    (e) => new Date(e.date) >= now
  );

  const scheduleInfo = upcomingEvent
    ? {
        id: upcomingEvent.id,
        eventType: upcomingEvent.eventType,
        date: upcomingEvent.date.toISOString(),
        startTime: upcomingEvent.startTime,
        endTime: upcomingEvent.endTime,
        notes: upcomingEvent.notes,
        crew: upcomingEvent.crew.map((c) => c.name),
      }
    : null;

  return NextResponse.json({
    project: {
      id: project.id,
      status: project.status,
      propertyAddress: `${project.property.address}, ${project.property.city}, ${project.property.state} ${project.property.zip}`,
      clientName: project.client.agentName,
      companyName: project.client.companyName,
      stageDate: project.stageDate ? project.stageDate.toISOString() : null,
      destageDate: project.destageDate
        ? project.destageDate.toISOString()
        : null,
    },
    items: itemsByRoom,
    propertyDetails: {
      address: project.property.address,
      city: project.property.city,
      state: project.property.state,
      zip: project.property.zip,
      sqft: project.property.sqft,
      bedrooms: project.property.bedrooms,
      bathrooms: project.property.bathrooms,
      notes: project.property.notes,
    },
    scheduleInfo,
    generatedAt: new Date().toISOString(),
    totalItems: project.projectItems.length,
    totalWeight,
  });
}
