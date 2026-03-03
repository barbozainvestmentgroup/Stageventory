import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClientSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where: Prisma.ClientWhereInput = { active: true };

  if (search) {
    where.OR = [
      { agentName: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { brokerage: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      _count: {
        select: {
          properties: true,
          projects: true,
        },
      },
      projects: {
        select: {
          totalPrice: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = clients.map((client) => {
    const totalRevenue = client.projects.reduce(
      (sum, p) => sum + (p.totalPrice || 0),
      0
    );
    const { projects, ...rest } = client;
    return {
      ...rest,
      totalRevenue,
      projectStatuses: projects.map((p) => p.status),
    };
  });

  return NextResponse.json({ clients: result });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { companyName, agentName, email, phone, brokerage, notes, preferredStyle, rating } = parsed.data;

  const client = await prisma.client.create({
    data: {
      companyName: companyName || null,
      agentName,
      email: email || null,
      phone: phone || null,
      brokerage: brokerage || null,
      notes: notes || null,
      preferredStyle: preferredStyle || null,
      rating: rating ?? 0,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
