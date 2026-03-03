"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  ArrowLeft,
  Pencil,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Ruler,
  History,
  QrCode,
  Upload,
  Trash2,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ItemForm } from "../item-form";
import { formatCurrency, formatDate } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string };
  project: { id: string; property: { address: string; city?: string } } | null;
}

interface ProjectAssignment {
  id: string;
  roomAssignment: string | null;
  checkedOutAt: string | null;
  checkedInAt: string | null;
  project: {
    id: string;
    status: string;
    property: { address: string; city: string };
    client: { agentName: string; companyName: string | null };
  };
}

interface ItemData {
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
  purchaseDate: string | null;
  replacementValue: number | null;
  condition: string;
  status: string;
  currentLocation: string | null;
  qrCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
  projectItems: ProjectAssignment[];
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

export function ItemDetail({ item, canWrite }: { item: ItemData; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: "Status updated", description: `Item marked as ${newStatus.replace("_", " ")}` });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("photos", file);
    }

    try {
      const res = await fetch(`/api/inventory/${item.id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "Photos uploaded" });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Failed to upload photos", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Photo removed" });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Failed to remove photo", variant: "destructive" });
    }
  };

  const printQrCode = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svg = document.getElementById("item-qr-code");
    if (!svg) return;
    printWindow.document.write(`
      <html><head><title>${item.sku} - QR Code</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0}
      .label{text-align:center;margin-top:12px}</style></head>
      <body>${svg.outerHTML}<div class="label"><strong>${item.sku}</strong><br/>${item.name}</div>
      <script>window.print();window.close();</script></body></html>
    `);
  };

  const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/inventory/${item.id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{item.name}</h2>
              <Badge variant={statusColors[item.status]}>{item.status.replace("_", " ")}</Badge>
              <Badge variant={conditionColors[item.condition]}>{item.condition.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              SKU: {item.sku} &middot; {item.category}
              {item.subcategory && ` / ${item.subcategory}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <Select value={item.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="STAGED">Staged</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <ItemForm
                    categories={[]}
                    item={{
                      ...item,
                      purchaseDate: item.purchaseDate,
                    }}
                    onSuccess={() => {
                      setIsEditOpen(false);
                      router.refresh();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Photos & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Photos</CardTitle>
              {canWrite && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {item.photos.length > 0 ? (
                <div className="space-y-3">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                    <img
                      src={item.photos[selectedPhoto]}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                    {canWrite && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => handleDeletePhoto(item.photos[selectedPhoto])}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {item.photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {item.photos.map((photo, i) => (
                        <button
                          key={photo}
                          onClick={() => setSelectedPhoto(i)}
                          className={`h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                            i === selectedPhoto ? "border-primary" : "border-transparent"
                          }`}
                        >
                          <img src={photo} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                  <div className="text-center">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">No photos yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {item.description && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{item.currentLocation || "Unknown"}</p>
                  </div>
                </div>
                {item.color && (
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="text-sm font-medium">{item.color}</p>
                  </div>
                )}
                {(item.length || item.width || item.height) && (
                  <div className="flex items-start gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dimensions (L x W x H)</p>
                      <p className="text-sm font-medium">
                        {item.length || "—"}&quot; x {item.width || "—"}&quot; x {item.height || "—"}&quot;
                      </p>
                    </div>
                  </div>
                )}
                {item.purchaseCost != null && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Cost</p>
                      <p className="text-sm font-medium">{formatCurrency(item.purchaseCost)}</p>
                    </div>
                  </div>
                )}
                {item.replacementValue != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Replacement Value</p>
                    <p className="text-sm font-medium">{formatCurrency(item.replacementValue)}</p>
                  </div>
                )}
                {item.purchaseDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Date</p>
                      <p className="text-sm font-medium">{formatDate(item.purchaseDate)}</p>
                    </div>
                  </div>
                )}
                {item.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{item.notes}</p>
                  </div>
                )}
              </div>
              {item.styleTags.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Style Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.styleTags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                History
              </CardTitle>
              <CardDescription>Status changes and activity log</CardDescription>
            </CardHeader>
            <CardContent>
              {item.history.length > 0 ? (
                <div className="space-y-3">
                  {item.history.map((entry) => (
                    <div key={entry.id} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div className="w-px flex-1 bg-border" />
                      </div>
                      <div className="pb-4 flex-1">
                        <p className="font-medium">{entry.action.replace("_", " ")}</p>
                        {entry.notes && (
                          <p className="text-muted-foreground">{entry.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.user.name} &middot; {formatDate(entry.createdAt)}
                          {entry.project && (
                            <> &middot; {entry.project.property.address}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - QR Code & Assignments */}
        <div className="space-y-6">
          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-white p-4">
                <QRCode
                  id="item-qr-code"
                  value={qrValue}
                  size={180}
                  level="M"
                />
              </div>
              <p className="text-sm font-mono text-muted-foreground">{item.sku}</p>
              <Button variant="outline" size="sm" onClick={printQrCode}>
                <Printer className="mr-2 h-4 w-4" />
                Print Label
              </Button>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusColors[item.status]}>{item.status.replace("_", " ")}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Condition</span>
                <Badge variant={conditionColors[item.condition]}>{item.condition.replace("_", " ")}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{item.currentLocation || "Unknown"}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Added</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Project Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project History</CardTitle>
              <CardDescription>Recent project assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {item.projectItems.length > 0 ? (
                <div className="space-y-3">
                  {item.projectItems.map((pi) => (
                    <Link
                      key={pi.id}
                      href={`/projects`}
                      className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium">
                        {pi.project.property.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pi.project.client.companyName || pi.project.client.agentName}
                      </p>
                      <div className="mt-1 flex gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {pi.project.status.replace("_", " ")}
                        </Badge>
                        {pi.roomAssignment && (
                          <Badge variant="secondary" className="text-[10px]">
                            {pi.roomAssignment}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not yet assigned to any projects.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
