import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProposalsPage } from "./proposals-page";

export default async function ProposalsServerPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "proposals:read")) {
    redirect("/dashboard");
  }

  const [proposals, contracts, projects] = await Promise.all([
    prisma.proposal.findMany({
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
    }),
    prisma.contract.findMany({
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
    }),
    prisma.project.findMany({
      where: {
        status: {
          in: ["CONSULTATION", "PROPOSAL", "CONTRACT", "SCHEDULED", "STAGED", "ACTIVE"],
        },
      },
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
  ]);

  const canWrite = hasPermission(session.user.role, "proposals:write");

  return (
    <ProposalsPage
      proposals={JSON.parse(JSON.stringify(proposals))}
      contracts={JSON.parse(JSON.stringify(contracts))}
      projects={JSON.parse(JSON.stringify(projects))}
      canWrite={canWrite}
    />
  );
}
