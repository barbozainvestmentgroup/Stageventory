import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unread = searchParams.get("unread");

  const where: Prisma.NotificationWhereInput = {
    userId: session.user.id,
  };

  if (unread === "true") {
    where.read = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { notificationIds, markAllRead } = body as {
    notificationIds?: string[];
    markAllRead?: boolean;
  };

  if (!notificationIds && !markAllRead) {
    return NextResponse.json(
      { error: "Either notificationIds or markAllRead must be provided" },
      { status: 400 }
    );
  }

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  }

  if (notificationIds && notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}
