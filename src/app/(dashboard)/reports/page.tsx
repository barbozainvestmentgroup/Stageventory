import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  BarChart3,
  Users,
  Layers,
  Activity,
} from "lucide-react";

// ---------- Types ----------

interface MonthlyRow {
  label: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

interface CategoryRow {
  category: string;
  count: number;
  replacementValue: number;
  stagedCount: number;
}

interface TopClient {
  id: string;
  agentName: string;
  companyName: string | null;
  projectCount: number;
  totalRevenue: number;
  avgProjectValue: number;
}

interface MonthlyProjectActivity {
  label: string;
  count: number;
}

// ---------- Status colors ----------

const projectStatusColors: Record<string, string> = {
  CONSULTATION: "bg-blue-500",
  PROPOSAL: "bg-indigo-500",
  CONTRACT: "bg-violet-500",
  SCHEDULED: "bg-cyan-500",
  STAGED: "bg-emerald-500",
  ACTIVE: "bg-green-500",
  DESTAGE_SCHEDULED: "bg-amber-500",
  DESTAGED: "bg-orange-500",
  INVOICED: "bg-rose-500",
  CLOSED: "bg-gray-500",
};

const projectStatusLabels: Record<string, string> = {
  CONSULTATION: "Consultation",
  PROPOSAL: "Proposal",
  CONTRACT: "Contract",
  SCHEDULED: "Scheduled",
  STAGED: "Staged",
  ACTIVE: "Active",
  DESTAGE_SCHEDULED: "Destage Scheduled",
  DESTAGED: "Destaged",
  INVOICED: "Invoiced",
  CLOSED: "Closed",
};

// ---------- Data fetching ----------

async function getRevenueStats() {
  const [paidInvoices, outstandingInvoices, projects, inventoryItems] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { status: "PAID" },
        select: { total: true },
      }),
      prisma.invoice.findMany({
        where: { status: { in: ["SENT", "OVERDUE", "PARTIAL"] } },
        select: { total: true },
      }),
      prisma.project.findMany({
        where: { totalPrice: { not: null } },
        select: { totalPrice: true },
      }),
      prisma.inventoryItem.findMany({
        select: { replacementValue: true },
      }),
    ]);

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const outstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.total,
    0
  );

  const projectValues = projects
    .map((p) => p.totalPrice)
    .filter((v): v is number => v !== null);
  const avgProjectValue =
    projectValues.length > 0
      ? projectValues.reduce((sum, v) => sum + v, 0) / projectValues.length
      : 0;

  const inventoryValue = inventoryItems.reduce(
    (sum, item) => sum + (item.replacementValue || 0),
    0
  );

  return { totalRevenue, outstanding, avgProjectValue, inventoryValue };
}

async function getRevenueByMonth(): Promise<MonthlyRow[]> {
  const now = new Date();
  const months: MonthlyRow[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const label = monthStart.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const [invoicesCreated, paymentsReceived, outstandingInvoices] =
      await Promise.all([
        prisma.invoice.findMany({
          where: {
            createdAt: { gte: monthStart, lt: monthEnd },
            status: { not: "VOID" },
          },
          select: { total: true },
        }),
        prisma.payment.findMany({
          where: {
            date: { gte: monthStart, lt: monthEnd },
          },
          select: { amount: true },
        }),
        prisma.invoice.findMany({
          where: {
            createdAt: { gte: monthStart, lt: monthEnd },
            status: { in: ["SENT", "OVERDUE", "PARTIAL"] },
          },
          select: { total: true },
        }),
      ]);

    months.push({
      label,
      invoiced: invoicesCreated.reduce((sum, inv) => sum + inv.total, 0),
      collected: paymentsReceived.reduce((sum, p) => sum + p.amount, 0),
      outstanding: outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0),
    });
  }

  return months;
}

async function getProjectStatusDistribution() {
  const projects = await prisma.project.findMany({
    select: { status: true },
  });

  const statusCounts: Record<string, number> = {};
  const allStatuses = [
    "CONSULTATION",
    "PROPOSAL",
    "CONTRACT",
    "SCHEDULED",
    "STAGED",
    "ACTIVE",
    "DESTAGE_SCHEDULED",
    "DESTAGED",
    "INVOICED",
    "CLOSED",
  ];

  for (const s of allStatuses) {
    statusCounts[s] = 0;
  }
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }

  const total = projects.length;
  return { statusCounts, total };
}

async function getInventoryUtilization() {
  const items = await prisma.inventoryItem.findMany({
    select: {
      status: true,
      category: true,
      subcategory: true,
      replacementValue: true,
    },
  });

  const totalItems = items.length;
  const available = items.filter((i) => i.status === "AVAILABLE").length;
  const staged = items.filter((i) => i.status === "STAGED").length;
  const inTransit = items.filter((i) => i.status === "IN_TRANSIT").length;
  const maintenance = items.filter((i) => i.status === "MAINTENANCE").length;
  const retired = items.filter((i) => i.status === "RETIRED").length;

  const activePool = totalItems - retired;
  const utilizationRate =
    activePool > 0 ? Math.round((staged / activePool) * 100) : 0;

  // Category breakdown
  const categoryMap = new Map<
    string,
    { count: number; replacementValue: number; stagedCount: number }
  >();

  for (const item of items) {
    const cat = item.category;
    const existing = categoryMap.get(cat) || {
      count: 0,
      replacementValue: 0,
      stagedCount: 0,
    };
    existing.count += 1;
    existing.replacementValue += item.replacementValue || 0;
    if (item.status === "STAGED") {
      existing.stagedCount += 1;
    }
    categoryMap.set(cat, existing);
  }

  const categories: CategoryRow[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      replacementValue: data.replacementValue,
      stagedCount: data.stagedCount,
    }))
    .sort((a, b) => b.replacementValue - a.replacementValue);

  return {
    totalItems,
    available,
    staged,
    inTransit,
    maintenance,
    retired,
    utilizationRate,
    categories,
  };
}

async function getTopClients(): Promise<TopClient[]> {
  const clients = await prisma.client.findMany({
    where: { active: true },
    include: {
      projects: {
        include: {
          invoices: {
            where: { status: "PAID" },
            select: { total: true },
          },
        },
      },
    },
  });

  const clientStats: TopClient[] = clients
    .map((client) => {
      const projectCount = client.projects.length;
      const totalRevenue = client.projects.reduce(
        (sum, project) =>
          sum + project.invoices.reduce((s, inv) => s + inv.total, 0),
        0
      );
      const avgProjectValue =
        projectCount > 0 ? totalRevenue / projectCount : 0;

      return {
        id: client.id,
        agentName: client.agentName,
        companyName: client.companyName,
        projectCount,
        totalRevenue,
        avgProjectValue,
      };
    })
    .filter((c) => c.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  return clientStats;
}

async function getMonthlyProjectActivity(): Promise<MonthlyProjectActivity[]> {
  const now = new Date();
  const months: MonthlyProjectActivity[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const label = monthStart.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const count = await prisma.project.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    });

    months.push({ label, count });
  }

  return months;
}

// ---------- Page ----------

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "reports:read")) {
    redirect("/dashboard");
  }

  const [
    revenueStats,
    revenueByMonth,
    projectDistribution,
    inventoryUtil,
    topClients,
    projectActivity,
  ] = await Promise.all([
    getRevenueStats(),
    getRevenueByMonth(),
    getProjectStatusDistribution(),
    getInventoryUtilization(),
    getTopClients(),
    getMonthlyProjectActivity(),
  ]);

  const monthlyTotals = revenueByMonth.reduce(
    (acc, m) => ({
      invoiced: acc.invoiced + m.invoiced,
      collected: acc.collected + m.collected,
      outstanding: acc.outstanding + m.outstanding,
    }),
    { invoiced: 0, collected: 0, outstanding: 0 }
  );

  const maxProjectCount = Math.max(...projectActivity.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Reports &amp; Analytics
        </h2>
        <p className="text-muted-foreground">
          Business performance overview
        </p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueStats.outstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sent, overdue &amp; partial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Project Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueStats.avgProjectValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Value
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueStats.inventoryValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total replacement value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue by Month
          </CardTitle>
          <CardDescription>Last 12 months financial summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                    Month
                  </th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">
                    Invoiced
                  </th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">
                    Collected
                  </th>
                  <th className="py-3 pl-4 text-right font-medium text-muted-foreground">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map((month) => (
                  <tr
                    key={month.label}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 font-medium">{month.label}</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(month.invoiced)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(month.collected)}
                    </td>
                    <td className="py-3 pl-4 text-right text-amber-600 dark:text-amber-400">
                      {month.outstanding > 0
                        ? formatCurrency(month.outstanding)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 pr-4">Totals</td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(monthlyTotals.invoiced)}
                  </td>
                  <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                    {formatCurrency(monthlyTotals.collected)}
                  </td>
                  <td className="py-3 pl-4 text-right text-amber-600 dark:text-amber-400">
                    {monthlyTotals.outstanding > 0
                      ? formatCurrency(monthlyTotals.outstanding)
                      : "-"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Project Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Project Status Distribution
          </CardTitle>
          <CardDescription>
            {projectDistribution.total} total project
            {projectDistribution.total !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectDistribution.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects found.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(projectDistribution.statusCounts).map(
                ([status, count]) => {
                  const percentage =
                    projectDistribution.total > 0
                      ? Math.round((count / projectDistribution.total) * 100)
                      : 0;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {projectStatusLabels[status] || status}
                        </span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-2.5 rounded-full transition-all",
                            projectStatusColors[status] || "bg-gray-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Utilization Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Utilization Report
          </CardTitle>
          <CardDescription>
            Current inventory status and category breakdown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status summary cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{inventoryUtil.totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {inventoryUtil.available}
              </p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {inventoryUtil.staged}
              </p>
              <p className="text-xs text-muted-foreground">Staged</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {inventoryUtil.inTransit}
              </p>
              <p className="text-xs text-muted-foreground">In Transit</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {inventoryUtil.maintenance}
              </p>
              <p className="text-xs text-muted-foreground">Maintenance</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-gray-500">
                {inventoryUtil.retired}
              </p>
              <p className="text-xs text-muted-foreground">Retired</p>
            </div>
          </div>

          {/* Utilization rate bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Utilization Rate</span>
              <span className="text-muted-foreground">
                {inventoryUtil.utilizationRate}% of active inventory staged
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className={cn(
                  "h-3 rounded-full transition-all",
                  inventoryUtil.utilizationRate >= 70
                    ? "bg-green-500"
                    : inventoryUtil.utilizationRate >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                )}
                style={{ width: `${inventoryUtil.utilizationRate}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Category breakdown table */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">
              Category Breakdown
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="py-2 px-4 text-right font-medium text-muted-foreground">
                      Items
                    </th>
                    <th className="py-2 px-4 text-right font-medium text-muted-foreground">
                      Replacement Value
                    </th>
                    <th className="py-2 pl-4 text-right font-medium text-muted-foreground">
                      Staged
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryUtil.categories.map((cat) => (
                    <tr
                      key={cat.category}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 pr-4 font-medium">
                        {cat.category}
                      </td>
                      <td className="py-2 px-4 text-right">{cat.count}</td>
                      <td className="py-2 px-4 text-right">
                        {formatCurrency(cat.replacementValue)}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        <Badge
                          variant={cat.stagedCount > 0 ? "default" : "secondary"}
                        >
                          {cat.stagedCount}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventoryUtil.categories.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No inventory items found.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Clients
          </CardTitle>
          <CardDescription>
            Ranked by total revenue from paid invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Client
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Company
                  </th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">
                    Projects
                  </th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">
                    Total Revenue
                  </th>
                  <th className="py-3 pl-4 text-right font-medium text-muted-foreground">
                    Avg Project Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, idx) => (
                  <tr
                    key={client.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {client.agentName}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {client.companyName || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {client.projectCount}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(client.totalRevenue)}
                    </td>
                    <td className="py-3 pl-4 text-right text-muted-foreground">
                      {formatCurrency(client.avgProjectValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topClients.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No client revenue data available yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Project Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monthly Project Activity
          </CardTitle>
          <CardDescription>
            Projects created per month (last 6 months)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectActivity.every((m) => m.count === 0) ? (
            <p className="text-sm text-muted-foreground">
              No projects created in the last 6 months.
            </p>
          ) : (
            <div className="space-y-3">
              {projectActivity.map((month) => {
                const widthPct =
                  maxProjectCount > 0
                    ? Math.round((month.count / maxProjectCount) * 100)
                    : 0;
                return (
                  <div key={month.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="w-24 font-medium">{month.label}</span>
                      <span className="text-muted-foreground">
                        {month.count} project{month.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-primary transition-all"
                        style={{
                          width: `${widthPct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
