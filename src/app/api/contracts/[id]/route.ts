import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContractStatus } from "@prisma/client";

const contractIncludes = {
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
  proposal: {
    select: { id: true, version: true, status: true },
  },
};

const VALID_TRANSITIONS: Record<string, ContractStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["VIEWED", "SIGNED", "EXPIRED", "CANCELLED"],
  VIEWED: ["SIGNED", "EXPIRED", "CANCELLED"],
  SIGNED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: contractIncludes,
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  return NextResponse.json(contract);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.contract.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status } = body as {
    status?: ContractStatus;
  };

  const updateData: Record<string, unknown> = {};

  if (status && status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 400 }
      );
    }

    updateData.status = status;

    if (status === "SIGNED") {
      updateData.signedAt = new Date();

      const project = await prisma.project.findUnique({
        where: { id: existing.projectId },
      });
      if (project && (project.status === "CONSULTATION" || project.status === "PROPOSAL")) {
        await prisma.project.update({
          where: { id: existing.projectId },
          data: { status: "CONTRACT" },
        });
      }
    }
  }

  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: updateData,
    include: contractIncludes,
  });

  if (status && status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        entityType: "contract",
        entityId: contract.id,
        action: "STATUS_CHANGE",
        details: {
          fromStatus: existing.status,
          toStatus: status,
        },
      },
    });
  }

  return NextResponse.json(contract);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT contracts can be deleted" },
      { status: 400 }
    );
  }

  await prisma.contract.delete({
    where: { id: params.id },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "contract",
      entityId: params.id,
      action: "DELETED",
      details: {},
    },
  });

  return NextResponse.json({ success: true });
}
