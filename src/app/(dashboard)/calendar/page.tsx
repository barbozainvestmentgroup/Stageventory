import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "calendar:read")) {
    redirect("/dashboard");
  }

  const crewMembers = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["CREW", "WAREHOUSE", "ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  const canWrite = hasPermission(session.user.role, "calendar:write");

  return (
    <CalendarView
      crewMembers={JSON.parse(JSON.stringify(crewMembers))}
      canWrite={canWrite}
    />
  );
}
