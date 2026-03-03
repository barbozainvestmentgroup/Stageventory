import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProposalStatus } from "@prisma/client";

const proposalIncludes = {
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
};

const VALID_TRANSITIONS: Record<string, ProposalStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["VIEWED", "APPROVED", "REJECTED"],
  VIEWED: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: proposalIncludes,
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json(proposal);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.proposal.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const body = await req.json();
  const { contentJson, status } = body as {
    contentJson?: Record<string, unknown>;
    status?: ProposalStatus;
  };

  const updateData: Record<string, unknown> = {};

  if (contentJson !== undefined) updateData.contentJson = contentJson;

  if (status && status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 400 }
      );
    }

    updateData.status = status;

    if (status === "SENT") {
      updateData.sentAt = new Date();
    }

    if (status === "APPROVED") {
      updateData.approvedAt = new Date();
      const project = await prisma.project.findUnique({
        where: { id: existing.projectId },
      });
      if (project && project.status === "CONSULTATION") {
        await prisma.project.update({
          where: { id: existing.projectId },
          data: { status: "PROPOSAL" },
        });
      }
    }
  }

  const proposal = await prisma.proposal.update({
    where: { id: params.id },
    data: updateData,
    include: proposalIncludes,
  });

  if (status && status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        entityType: "proposal",
        entityId: proposal.id,
        action: "STATUS_CHANGE",
        details: {
          fromStatus: existing.status,
          toStatus: status,
        },
      },
    });
  }

  return NextResponse.json(proposal);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT proposals can be deleted" },
      { status: 400 }
    );
  }

  await prisma.proposal.delete({
    where: { id: params.id },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "proposal",
      entityId: params.id,
      action: "DELETED",
      details: {
        version: proposal.version,
      },
    },
  });

  return NextResponse.json({ success: true });
}
