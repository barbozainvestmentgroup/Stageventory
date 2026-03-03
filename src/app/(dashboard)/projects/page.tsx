import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsView } from "./projects-view";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "projects:read")) {
    redirect("/dashboard");
  }

  const view = searchParams.view || "kanban";
  const status = searchParams.status || "";

  const where: Record<string, unknown> = {};

  if (status === "active") {
    where.status = { in: ["STAGED", "ACTIVE", "SCHEDULED"] };
  } else if (status === "pipeline") {
    where.status = { in: ["CONSULTATION", "PROPOSAL", "CONTRACT"] };
  } else if (status === "completed") {
    where.status = { in: ["DESTAGED", "INVOICED", "CLOSED"] };
  }

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
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
    }),
    prisma.client.findMany({
      where: { active: true },
      select: {
        id: true,
        agentName: true,
        companyName: true,
        properties: {
          select: { id: true, address: true, city: true },
        },
      },
      orderBy: { agentName: "asc" },
    }),
  ]);

  const canWrite = hasPermission(session.user.role, "projects:write");

  return (
    <ProjectsView
      projects={JSON.parse(JSON.stringify(projects))}
      canWrite={canWrite}
      clients={JSON.parse(JSON.stringify(clients))}
      initialView={view as "kanban" | "list"}
      initialStatus={status}
    />
  );
}
