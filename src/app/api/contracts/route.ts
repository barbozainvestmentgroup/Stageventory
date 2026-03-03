import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, ContractStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const where: Prisma.ContractWhereInput = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (status) {
    where.status = status as ContractStatus;
  }

  const contracts = await prisma.contract.findMany({
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
      proposal: {
        select: { id: true, version: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { projectId, proposalId } = body as {
    projectId: string;
    proposalId?: string;
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

  const contract = await prisma.contract.create({
    data: {
      projectId,
      proposalId: proposalId || null,
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
      proposal: {
        select: { id: true, version: true, status: true },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "contract",
      entityId: contract.id,
      action: "CREATED",
      details: {
        projectId,
        proposalId: proposalId || null,
      },
    },
  });

  return NextResponse.json(contract, { status: 201 });
}
