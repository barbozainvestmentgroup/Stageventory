"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  ScanLine,
  Package,
  ArrowRight,
  CheckCircle,
  XCircle,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface ScannedItem {
  id: string;
  sku: string;
  name: string;
  status: string;
  condition: string;
  category: string;
  currentLocation: string | null;
}

export default function ScannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [manualInput, setManualInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lastResult, setLastResult] = useState<{
    item: ScannedItem;
    action: string;
  } | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input for barcode scanner input
  useEffect(() => {
    if (mode === "manual" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const lookupItem = useCallback(async (query: string) => {
    try {
      // Try lookup by SKU or ID
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(query)}&limit=1`);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();

      if (data.items.length === 0) {
        toast({
          title: "Item not found",
          description: `No item matching "${query}"`,
          variant: "destructive",
        });
        return;
      }

      const item = data.items[0] as ScannedItem;
      setLastResult({ item, action: "found" });

      // Add to batch if in batch mode
      if (batchMode) {
        setScannedItems((prev) => {
          if (prev.some((i) => i.id === item.id)) return prev;
          return [...prev, item];
        });
      }

      if (!batchMode) {
        router.push(`/inventory/${item.id}`);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to look up item",
        variant: "destructive",
      });
    }
  }, [batchMode, router, toast]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    lookupItem(manualInput.trim());
    setManualInput("");
  };

  const handleBatchAction = async (action: "check-in" | "check-out") => {
    if (scannedItems.length === 0) return;

    const newStatus = action === "check-in" ? "AVAILABLE" : "IN_TRANSIT";
    const newLocation = action === "check-in" ? "Warehouse" : "In Transit";

    let successCount = 0;
    for (const item of scannedItems) {
      try {
        const res = await fetch(`/api/inventory/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            currentLocation: newLocation,
          }),
        });
        if (res.ok) successCount++;
      } catch {
        // Continue with next item
      }
    }

    toast({
      title: `Batch ${action === "check-in" ? "Check-In" : "Check-Out"} Complete`,
      description: `${successCount} of ${scannedItems.length} items updated.`,
    });

    setScannedItems([]);
    setLastResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scanner</h2>
        <p className="text-muted-foreground">
          Scan QR codes or enter SKUs to quickly look up and manage items
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Scan / Search</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={mode === "manual" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMode("manual")}
                  >
                    <Keyboard className="mr-1 h-4 w-4" />
                    Manual
                  </Button>
                  <Button
                    variant={mode === "camera" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMode("camera")}
                  >
                    <Camera className="mr-1 h-4 w-4" />
                    Camera
                  </Button>
                </div>
              </div>
              <CardDescription>
                {mode === "manual"
                  ? "Enter a SKU or item name. Works with USB barcode scanners too."
                  : "Point your camera at a QR code to scan."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "manual" ? (
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Enter SKU (e.g., FRN-0001) or item name..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit">
                    <ScanLine className="mr-2 h-4 w-4" />
                    Look Up
                  </Button>
                </form>
              ) : (
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Camera scanner available on mobile devices.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use manual entry or a USB barcode scanner for desktop.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Mode Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Batch Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Scan multiple items for bulk check-in or check-out
                  </p>
                </div>
                <Button
                  variant={batchMode ? "default" : "outline"}
                  onClick={() => {
                    setBatchMode(!batchMode);
                    if (batchMode) {
                      setScannedItems([]);
                      setLastResult(null);
                    }
                  }}
                >
                  {batchMode ? "Exit Batch Mode" : "Enable Batch Mode"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Last Scanned Result */}
          {lastResult && !batchMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Scanned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{lastResult.item.name}</p>
                    <p className="text-sm text-muted-foreground">{lastResult.item.sku}</p>
                    <div className="mt-1 flex gap-1">
                      <Badge variant="outline">{lastResult.item.status}</Badge>
                      <Badge variant="outline">{lastResult.item.condition}</Badge>
                    </div>
                  </div>
                  <Link href={`/inventory/${lastResult.item.id}`}>
                    <Button variant="outline" size="sm">
                      View <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Batch Results */}
        <div>
          {batchMode && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Scanned Items ({scannedItems.length})
                    </CardTitle>
                    <CardDescription>
                      Items ready for bulk action
                    </CardDescription>
                  </div>
                  {scannedItems.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBatchAction("check-in")}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Check In All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBatchAction("check-out")}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Check Out All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {scannedItems.length > 0 ? (
                  <div className="space-y-2">
                    {scannedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.sku} &middot; {item.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setScannedItems((prev) =>
                                prev.filter((i) => i.id !== item.id)
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Scan items to add them to the batch
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!batchMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm">Scan or Enter SKU</p>
                    <p className="text-xs text-muted-foreground">
                      Use the QR code on the item label or type the SKU manually
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm">View Item Details</p>
                    <p className="text-xs text-muted-foreground">
                      See current status, location, and condition at a glance
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm">Update Status</p>
                    <p className="text-xs text-muted-foreground">
                      Check in (return to warehouse) or check out (assign to project)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-sm">Batch Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Enable batch mode to scan multiple items for loading/unloading trucks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
