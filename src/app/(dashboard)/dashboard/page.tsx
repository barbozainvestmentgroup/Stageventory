import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, ClipboardList, Users, DollarSign, Calendar, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function getDashboardStats() {
  const [totalItems, activeProjects, totalClients, stagedItems] =
    await Promise.all([
      prisma.inventoryItem.count(),
      prisma.project.count({
        where: {
          status: { in: ["STAGED", "ACTIVE", "SCHEDULED"] },
        },
      }),
      prisma.client.count({ where: { active: true } }),
      prisma.inventoryItem.count({ where: { status: "STAGED" } }),
    ]);

  const utilizationRate =
    totalItems > 0 ? Math.round((stagedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    activeProjects,
    totalClients,
    stagedItems,
    utilizationRate,
  };
}

async function getRecentActivity() {
  return prisma.activityLog.findMany({
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
}

async function getUpcomingEvents() {
  const now = new Date();
  return prisma.scheduleEvent.findMany({
    where: {
      date: { gte: now },
    },
    include: {
      project: {
        include: {
          property: { select: { address: true, city: true } },
          client: { select: { agentName: true } },
        },
      },
      crew: { select: { name: true } },
    },
    orderBy: { date: "asc" },
    take: 5,
  });
}

const eventTypeColors: Record<string, string> = {
  CONSULTATION: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  STAGE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  DESTAGE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  MAINTENANCE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const actionLabels: Record<string, string> = {
  CREATED: "created",
  UPDATED: "updated",
  ITEMS_ADDED: "added items to",
  ITEM_REMOVED: "removed item from",
  STATUS_CHANGED: "changed status of",
  STAGED: "staged",
  RETURNED: "returned",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const [stats, recentActivity, upcomingEvents] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
    getUpcomingEvents(),
  ]);

  const kpiCards = [
    {
      title: "Total Inventory",
      value: stats.totalItems.toString(),
      description: `${stats.stagedItems} currently staged`,
      icon: Package,
    },
    {
      title: "Active Projects",
      value: stats.activeProjects.toString(),
      description: "In progress",
      icon: ClipboardList,
    },
    {
      title: "Clients",
      value: stats.totalClients.toString(),
      description: "Active clients",
      icon: Users,
    },
    {
      title: "Utilization Rate",
      value: `${stats.utilizationRate}%`,
      description: "Inventory in use",
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your staging operations
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upcoming Events and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Next scheduled activities</CardDescription>
            </div>
            <Link
              href="/calendar"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events scheduled.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${eventTypeColors[event.eventType] || ""}`}>
                          {event.eventType}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.date.toISOString())}
                          {event.startTime && ` at ${event.startTime}`}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {event.project.property.address}, {event.project.property.city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.project.client.agentName}
                        {event.crew.length > 0 && (
                          <> &middot; Crew: {event.crew.map((c) => c.name).join(", ")}</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your team</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity yet. Start by adding inventory items or
                creating a project.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.user.name}</span>{" "}
                        {actionLabels[log.action] || log.action.toLowerCase()}{" "}
                        <span className="text-muted-foreground">{log.entityType}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt.toISOString())}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks at your fingertips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(session?.user?.role === "ADMIN" ||
              session?.user?.role === "WAREHOUSE") && (
              <QuickActionButton
                href="/inventory"
                label="Add Inventory"
              />
            )}
            {(session?.user?.role === "ADMIN" ||
              session?.user?.role === "OFFICE") && (
              <>
                <QuickActionButton
                  href="/projects"
                  label="New Project"
                />
                <QuickActionButton
                  href="/clients"
                  label="Add Client"
                />
              </>
            )}
            <QuickActionButton
              href="/calendar"
              label="View Calendar"
            />
            {(session?.user?.role === "ADMIN" ||
              session?.user?.role === "OFFICE") && (
              <QuickActionButton
                href="/proposals"
                label="Proposals"
              />
            )}
            <QuickActionButton
              href="/inventory/scanner"
              label="Scan Items"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg border border-dashed p-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </Link>
  );
}
