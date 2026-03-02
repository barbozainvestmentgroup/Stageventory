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
import { Package, ClipboardList, Users, DollarSign } from "lucide-react";

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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats();

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

      {/* Recent Activity and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No recent activity yet. Start by adding inventory items or
                creating a project.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {session?.user?.role === "ADMIN" ||
              session?.user?.role === "WAREHOUSE" ? (
                <QuickActionButton
                  href="/inventory"
                  label="Add Inventory"
                  icon="package"
                />
              ) : null}
              {session?.user?.role === "ADMIN" ||
              session?.user?.role === "OFFICE" ? (
                <>
                  <QuickActionButton
                    href="/projects"
                    label="New Project"
                    icon="clipboard"
                  />
                  <QuickActionButton
                    href="/clients"
                    label="Add Client"
                    icon="users"
                  />
                </>
              ) : null}
              <QuickActionButton
                href="/calendar"
                label="View Calendar"
                icon="calendar"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  label,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-center rounded-lg border border-dashed p-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </a>
  );
}
