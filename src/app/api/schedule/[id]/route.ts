import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventType, Prisma } from "@prisma/client";

const eventIncludes = {
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
  crew: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.ScheduleEventInclude;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "calendar:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const event = await prisma.scheduleEvent.findUnique({
    where: { id: params.id },
    include: eventIncludes,
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "calendar:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.scheduleEvent.findUnique({
    where: { id: params.id },
    include: {
      crew: { select: { id: true } },
      project: {
        include: {
          property: { select: { address: true } },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const { eventType, date, startTime, endTime, notes, crewIds } = body as {
    eventType?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    crewIds?: string[];
  };

  // Validate eventType if provided
  if (eventType) {
    const validEventTypes: EventType[] = ["CONSULTATION", "STAGE", "DESTAGE", "MAINTENANCE"];
    if (!validEventTypes.includes(eventType as EventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (eventType !== undefined) updateData.eventType = eventType as EventType;
  if (date !== undefined) updateData.date = new Date(date);
  if (startTime !== undefined) updateData.startTime = startTime || null;
  if (endTime !== undefined) updateData.endTime = endTime || null;
  if (notes !== undefined) updateData.notes = notes || null;

  // Handle crew updates: disconnect all existing, reconnect with new list
  if (crewIds !== undefined) {
    const existingCrewIds = existing.crew.map((c) => c.id);

    updateData.crew = {
      disconnect: existingCrewIds.map((id) => ({ id })),
      connect: crewIds.map((id: string) => ({ id })),
    };

    // Determine newly added crew members (not previously assigned)
    const existingCrewSet = new Set(existingCrewIds);
    const newCrewIds = crewIds.filter((id: string) => !existingCrewSet.has(id));

    // Create notifications for newly added crew members
    if (newCrewIds.length > 0) {
      const eventDate = date ? new Date(date) : existing.date;
      const formattedDate = eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const resolvedEventType = eventType || existing.eventType;
      const propertyAddress = existing.project.property.address;

      const notifications = newCrewIds.map((userId: string) => ({
        userId,
        type: "SCHEDULE_ASSIGNMENT",
        message: `You've been assigned to a ${resolvedEventType} at ${propertyAddress} on ${formattedDate}`,
      }));

      await prisma.notification.createMany({
        data: notifications,
      });
    }
  }

  const event = await prisma.scheduleEvent.update({
    where: { id: params.id },
    data: updateData,
    include: eventIncludes,
  });

  return NextResponse.json(event);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "calendar:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const event = await prisma.scheduleEvent.findUnique({
    where: { id: params.id },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.scheduleEvent.delete({
    where: { id: params.id },
  });

  // Log activity on the project
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "project",
      entityId: event.projectId,
      action: "EVENT_DELETED",
      details: {
        eventId: event.id,
        eventType: event.eventType,
        date: event.date.toISOString(),
      },
    },
  });

  return NextResponse.json({ success: true });
}
