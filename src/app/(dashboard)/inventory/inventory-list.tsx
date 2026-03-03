"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Package,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItemForm } from "./item-form";
import { formatCurrency } from "@/lib/utils";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  photos: string[];
  length: number | null;
  width: number | null;
  height: number | null;
  color: string | null;
  styleTags: string[];
  purchaseCost: number | null;
  replacementValue: number | null;
  condition: string;
  status: string;
  currentLocation: string | null;
  createdAt: string;
}

interface Props {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    category: string;
    status: string;
    condition: string;
    style: string;
    categories: string[];
    styles: string[];
  };
  canWrite: boolean;
}

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  AVAILABLE: "success",
  STAGED: "default",
  IN_TRANSIT: "warning",
  MAINTENANCE: "destructive",
  RETIRED: "secondary",
};

const conditionColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  EXCELLENT: "success",
  GOOD: "default",
  FAIR: "warning",
  NEEDS_REPAIR: "destructive",
  RETIRED: "secondary",
};

export function InventoryList({ items, pagination, filters, canWrite }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchInput, setSearchInput] = useState(filters.search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(
    !!(filters.category || filters.status || filters.condition || filters.style)
  );

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page"); // Reset page on filter change
    router.push(`/inventory?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const clearFilters = () => {
    router.push("/inventory");
    setSearchInput("");
  };

  const hasActiveFilters = filters.category || filters.status || filters.condition || filters.style || filters.search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            {pagination.total} items total
          </p>
        </div>
        {canWrite && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <ItemForm
                categories={filters.categories}
                onSuccess={() => {
                  setIsCreateOpen(false);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, color..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setView("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setView("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-lg border p-4">
            <Select
              value={filters.category || "all"}
              onValueChange={(v) => updateParams({ category: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filters.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || "all"}
              onValueChange={(v) => updateParams({ status: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="STAGED">Staged</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.condition || "all"}
              onValueChange={(v) => updateParams({ condition: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="EXCELLENT">Excellent</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="FAIR">Fair</SelectItem>
                <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.style || "all"}
              onValueChange={(v) => updateParams({ style: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                {filters.styles.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No items found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Get started by adding your first inventory item."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Link key={item.id} href={`/inventory/${item.id}`}>
              <Card className="group cursor-pointer transition-shadow hover:shadow-md overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {item.photos.length > 0 ? (
                    <img
                      src={item.photos[0]}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={statusColors[item.status] || "secondary"} className="text-[10px]">
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <h3 className="font-medium text-sm leading-tight mt-0.5 line-clamp-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {item.category}
                    </span>
                    {item.replacementValue && (
                      <span className="text-xs font-medium">
                        {formatCurrency(item.replacementValue)}
                      </span>
                    )}
                  </div>
                  {item.styleTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.styleTags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-[80px_1fr_150px_120px_120px_100px] gap-4 border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
            <span>SKU</span>
            <span>Name</span>
            <span>Category</span>
            <span>Status</span>
            <span>Condition</span>
            <span>Value</span>
          </div>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/inventory/${item.id}`}
              className="grid grid-cols-[80px_1fr_150px_120px_120px_100px] gap-4 border-b p-3 text-sm hover:bg-muted/30 transition-colors items-center"
            >
              <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
              <span className="font-medium truncate">{item.name}</span>
              <span className="text-muted-foreground text-xs">{item.category}</span>
              <Badge variant={statusColors[item.status] || "secondary"} className="w-fit text-[10px]">
                {item.status.replace("_", " ")}
              </Badge>
              <Badge variant={conditionColors[item.condition] || "secondary"} className="w-fit text-[10px]">
                {item.condition.replace("_", " ")}
              </Badge>
              <span className="text-xs">
                {item.replacementValue ? formatCurrency(item.replacementValue) : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(pagination.page - 1));
                router.push(`/inventory?${params.toString()}`);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(pagination.page + 1));
                router.push(`/inventory?${params.toString()}`);
              }}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
