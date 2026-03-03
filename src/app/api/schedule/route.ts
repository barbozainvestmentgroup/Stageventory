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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "calendar:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const type = searchParams.get("type");
  const crewId = searchParams.get("crewId");

  const where: Prisma.ScheduleEventWhereInput = {};

  if (start || end) {
    where.date = {};
    if (start) {
      where.date.gte = new Date(start);
    }
    if (end) {
      where.date.lte = new Date(end);
    }
  }

  if (type) {
    where.eventType = type as EventType;
  }

  if (crewId) {
    where.crew = {
      some: { id: crewId },
    };
  }

  const events = await prisma.scheduleEvent.findMany({
    where,
    include: eventIncludes,
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
    ],
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "calendar:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { projectId, eventType, date, startTime, endTime, notes, crewIds } = body as {
    projectId: string;
    eventType: string;
    date: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    crewIds?: string[];
  };

  // Validate required fields
  if (!projectId || !eventType || !date) {
    return NextResponse.json(
      { error: "projectId, eventType, and date are required" },
      { status: 400 }
    );
  }

  // Validate eventType
  const validEventTypes: EventType[] = ["CONSULTATION", "STAGE", "DESTAGE", "MAINTENANCE"];
  if (!validEventTypes.includes(eventType as EventType)) {
    return NextResponse.json(
      { error: `Invalid eventType. Must be one of: ${validEventTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      property: { select: { address: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Build crew connections
  const crewConnect = crewIds && crewIds.length > 0
    ? { connect: crewIds.map((id: string) => ({ id })) }
    : undefined;

  const event = await prisma.scheduleEvent.create({
    data: {
      projectId,
      eventType: eventType as EventType,
      date: new Date(date),
      startTime: startTime || null,
      endTime: endTime || null,
      notes: notes || null,
      crew: crewConnect,
    },
    include: eventIncludes,
  });

  // Create notifications for assigned crew members
  if (crewIds && crewIds.length > 0) {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const notifications = crewIds.map((userId: string) => ({
      userId,
      type: "SCHEDULE_ASSIGNMENT",
      message: `You've been assigned to a ${eventType} at ${project.property.address} on ${formattedDate}`,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });
  }

  // Log activity on the project
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "project",
      entityId: projectId,
      action: "EVENT_CREATED",
      details: {
        eventId: event.id,
        eventType,
        date,
      },
    },
  });

  return NextResponse.json(event, { status: 201 });
}
