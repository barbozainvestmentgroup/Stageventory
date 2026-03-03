"use client";

import { Package, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface PackageItem {
  id: string;
  quantity: number;
  category: string | null;
  item: {
    id: string;
    sku: string;
    name: string;
    photos: string[];
    status: string;
    category: string;
    replacementValue: number | null;
  } | null;
}

interface RoomPackage {
  id: string;
  name: string;
  style: string | null;
  roomType: string;
  description: string | null;
  totalCost: number | null;
  items: PackageItem[];
}

export function PackagesList({
  packages,
}: {
  packages: RoomPackage[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Room Packages</h2>
          <p className="text-muted-foreground">
            Reusable room staging packages with pre-selected items
          </p>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No packages yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Room packages will be created as part of the project management workflow.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.roomType}</CardDescription>
                  </div>
                  {pkg.style && <Badge variant="outline">{pkg.style}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {pkg.description}
                  </p>
                )}

                {/* Items in package */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Items ({pkg.items.length})
                  </p>
                  {pkg.items.slice(0, 5).map((pi) => (
                    <div
                      key={pi.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        {pi.item?.photos?.[0] ? (
                          <img
                            src={pi.item.photos[0]}
                            alt=""
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      <span className="truncate">
                        {pi.item?.name || pi.category || "Unassigned"}
                      </span>
                      {pi.quantity > 1 && (
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          x{pi.quantity}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {pkg.items.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{pkg.items.length - 5} more items
                    </p>
                  )}
                </div>

                {/* Total cost */}
                {pkg.totalCost != null && (
                  <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatCurrency(pkg.totalCost)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      package cost
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
