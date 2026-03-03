import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations";
import { Prisma, ProjectStatus } from "@prisma/client";

const STATUS_GROUPS: Record<string, ProjectStatus[]> = {
  active: ["STAGED", "ACTIVE", "SCHEDULED"],
  pipeline: ["CONSULTATION", "PROPOSAL", "CONTRACT"],
  completed: ["DESTAGED", "INVOICED", "CLOSED"],
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const where: Prisma.ProjectWhereInput = {};

  if (status) {
    const groupStatuses = STATUS_GROUPS[status.toLowerCase()];
    if (groupStatuses) {
      where.status = { in: groupStatuses };
    } else {
      where.status = status as ProjectStatus;
    }
  }

  if (search) {
    where.OR = [
      { property: { address: { contains: search, mode: "insensitive" } } },
      { property: { city: { contains: search, mode: "insensitive" } } },
      { client: { agentName: { contains: search, mode: "insensitive" } } },
      { client: { companyName: { contains: search, mode: "insensitive" } } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      property: {
        select: { id: true, address: true, city: true },
      },
      client: {
        select: { id: true, agentName: true, companyName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { propertyId, clientId, status, stageDate, destageDate, pricingType, totalPrice, notes } = parsed.data;

  const project = await prisma.project.create({
    data: {
      propertyId,
      clientId,
      status: status || "CONSULTATION",
      stageDate: stageDate ? new Date(stageDate) : null,
      destageDate: destageDate ? new Date(destageDate) : null,
      pricingType: pricingType || null,
      totalPrice: totalPrice ?? null,
      notes: notes || null,
      createdById: session.user.id,
    },
    include: {
      property: {
        select: { id: true, address: true, city: true },
      },
      client: {
        select: { id: true, agentName: true, companyName: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "project",
      entityId: project.id,
      action: "CREATED",
      details: { status: project.status },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
