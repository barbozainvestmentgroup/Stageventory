import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, ProposalStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const where: Prisma.ProposalWhereInput = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (status) {
    where.status = status as ProposalStatus;
  }

  const proposals = await prisma.proposal.findMany({
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ proposals });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { projectId, contentJson } = body as {
    projectId: string;
    contentJson?: Record<string, unknown>;
  };

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const existingCount = await prisma.proposal.count({
    where: { projectId },
  });

  const proposal = await prisma.proposal.create({
    data: {
      projectId,
      version: existingCount + 1,
      contentJson: contentJson ? (contentJson as Prisma.InputJsonValue) : Prisma.JsonNull,
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
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "proposal",
      entityId: proposal.id,
      action: "CREATED",
      details: {
        version: proposal.version,
        projectId,
      },
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
