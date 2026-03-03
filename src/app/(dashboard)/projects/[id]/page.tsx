import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectDetail } from "./project-detail";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:read")) {
    redirect("/dashboard");
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      client: true,
      projectItems: {
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              subcategory: true,
              photos: true,
              status: true,
              condition: true,
              replacementValue: true,
              currentLocation: true,
            },
          },
        },
        orderBy: { checkedOutAt: "desc" },
      },
      proposals: {
        orderBy: { createdAt: "desc" },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
      },
      scheduleEvents: {
        include: {
          crew: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch activity log for timeline
  const activityLog = await prisma.activityLog.findMany({
    where: {
      entityType: "project",
      entityId: project.id,
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const canWrite = hasPermission(session.user.role, "projects:write");

  return (
    <ProjectDetail
      project={JSON.parse(JSON.stringify(project))}
      activityLog={JSON.parse(JSON.stringify(activityLog))}
      canWrite={canWrite}
    />
  );
}
