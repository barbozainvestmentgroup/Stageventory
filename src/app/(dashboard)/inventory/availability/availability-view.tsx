"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Truck,
  Wrench,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  status: string;
  condition: string;
  currentLocation: string | null;
  styleTags: string[];
  color: string | null;
  photos: string[];
}

interface Props {
  items: Item[];
  counts: Record<string, number>;
}

const statusConfig = {
  AVAILABLE: { label: "Available", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
  STAGED: { label: "Staged", icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  IN_TRANSIT: { label: "In Transit", icon: Truck, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
};

export function AvailabilityView({ items, counts }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Availability</h2>
        <p className="text-muted-foreground">
          Real-time view of inventory status and availability
        </p>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = counts[key] || 0;
          const Icon = config.icon;
          const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                statusFilter === key ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                  <div className={`rounded-full p-2 ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${config.color.replace("text-", "bg-")}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{pct}% of inventory</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filtered.length} Items
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="ml-2">
                {statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No items match your criteria</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const config = statusConfig[item.status as keyof typeof statusConfig];
                const Icon = config?.icon || Package;
                return (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      {item.photos[0] ? (
                        <img src={item.photos[0]} alt="" className="h-full w-full rounded object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku} &middot; {item.category}
                        {item.subcategory && ` / ${item.subcategory}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-1 ${config?.color || ""}`}>
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{config?.label || item.status}</span>
                      </div>
                      {item.currentLocation && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {item.currentLocation}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
