import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateClientSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      properties: {
        include: {
          projects: {
            include: {
              createdBy: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      projects: {
        include: {
          property: { select: { address: true, city: true } },
          invoices: { select: { total: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await prisma.client.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { email, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  if (email !== undefined) {
    updateData.email = email || null;
  }

  const client = await prisma.client.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(client);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        where: {
          status: {
            notIn: ["CLOSED", "DESTAGED", "INVOICED"],
          },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (existing.projects.length > 0) {
    return NextResponse.json(
      { error: "Client has active projects. Close or complete them first." },
      { status: 400 }
    );
  }

  await prisma.client.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
