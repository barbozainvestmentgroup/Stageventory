"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Calendar,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UserRole } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "OFFICE", "WAREHOUSE", "CREW"],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["ADMIN", "OFFICE", "WAREHOUSE"],
    children: [
      { label: "All Items", href: "/inventory" },
      { label: "Packages", href: "/inventory/packages" },
      { label: "Scanner", href: "/inventory/scanner" },
      { label: "Availability", href: "/inventory/availability" },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: ClipboardList,
    roles: ["ADMIN", "OFFICE", "WAREHOUSE", "CREW"],
    children: [
      { label: "Active", href: "/projects?status=active" },
      { label: "Pipeline", href: "/projects?status=pipeline" },
      { label: "Completed", href: "/projects?status=completed" },
    ],
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
    roles: ["ADMIN", "OFFICE", "WAREHOUSE", "CREW"],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    roles: ["ADMIN", "OFFICE"],
  },
  {
    label: "Proposals",
    href: "/proposals",
    icon: FileText,
    roles: ["ADMIN", "OFFICE"],
  },
  {
    label: "Invoicing",
    href: "/invoicing",
    icon: DollarSign,
    roles: ["ADMIN", "OFFICE"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const userRole = session?.user?.role as UserRole | undefined;

  const filteredNav = navItems.filter(
    (item) => userRole && item.roles.includes(userRole)
  );

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                SF
              </span>
            </div>
            <span className="text-lg font-semibold">StageFlow</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              (item.children?.some((c) => pathname === c.href));
            const isExpanded = expandedItems.includes(item.label);
            const Icon = item.icon;

            return (
              <li key={item.label}>
                {item.children && !collapsed ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(item.label)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                                pathname === child.href
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground hover:text-accent-foreground"
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      {!collapsed && (
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            StageFlow v0.1.0
          </p>
        </div>
      )}
    </aside>
  );
}
