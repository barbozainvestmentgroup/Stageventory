"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Home,
  Package,
  History,
  FileText,
  Plus,
  Search,
  X,
  Check,
  Bed,
  Bath,
  Ruler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatCurrency, formatDate } from "@/lib/utils";

// --- Types ---

interface PropertyData {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  listingPrice: number | null;
  mlsNumber: string | null;
  notes: string | null;
}

interface ClientData {
  id: string;
  agentName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  brokerage: string | null;
}

interface InventoryItemData {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  photos: string[];
  status: string;
  condition: string;
  replacementValue: number | null;
  currentLocation: string | null;
}

interface ProjectItemData {
  id: string;
  itemId: string;
  roomAssignment: string | null;
  checkedOutAt: string | null;
  checkedInAt: string | null;
  item: InventoryItemData;
}

interface ProposalData {
  id: string;
  version: number;
  status: string;
  sentAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface ContractData {
  id: string;
  status: string;
  signedAt: string | null;
  createdAt: string;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  amount: number;
  total: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: string;
}

interface ScheduleEventData {
  id: string;
  eventType: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  crew: { id: string; name: string }[];
}

interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string };
}

interface ProjectData {
  id: string;
  propertyId: string;
  clientId: string;
  status: string;
  stageDate: string | null;
  destageDate: string | null;
  pricingType: string | null;
  totalPrice: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  property: PropertyData;
  client: ClientData;
  projectItems: ProjectItemData[];
  proposals: ProposalData[];
  contracts: ContractData[];
  invoices: InvoiceData[];
  scheduleEvents: ScheduleEventData[];
}

interface Props {
  project: ProjectData;
  activityLog: ActivityLogEntry[];
  canWrite: boolean;
}

// --- Constants ---

const ALL_STATUSES = [
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
] as const;

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  CONSULTATION: "bg-purple-100 text-purple-800 border-purple-200",
  PROPOSAL: "bg-blue-100 text-blue-800 border-blue-200",
  CONTRACT: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SCHEDULED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  STAGED: "bg-orange-100 text-orange-800 border-orange-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  DESTAGE_SCHEDULED: "bg-amber-100 text-amber-800 border-amber-200",
  DESTAGED: "bg-teal-100 text-teal-800 border-teal-200",
  INVOICED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
};

const PRICING_LABELS: Record<string, string> = {
  MONTHLY_RENTAL: "Monthly Rental",
  FLAT_FEE: "Flat Fee",
};

// --- Tabs ---

type TabKey = "items" | "timeline" | "documents";

// --- Component ---

export function ProjectDetail({ project, activityLog, canWrite }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("items");
  const [addItemsOpen, setAddItemsOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast({
        title: "Status updated",
        description: `Project status changed to ${STATUS_LABELS[newStatus]}.`,
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleRemoveItem = async (projectItemId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectItemId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove item");
      }
      toast({ title: "Item removed", description: "Item has been removed from the project." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  // Group project items by room
  const itemsByRoom: Record<string, ProjectItemData[]> = {};
  for (const pi of project.projectItems) {
    const room = pi.roomAssignment || "Unassigned";
    if (!itemsByRoom[room]) itemsByRoom[room] = [];
    itemsByRoom[room].push(pi);
  }

  const totalItemValue = project.projectItems.reduce(
    (sum, pi) => sum + (pi.item.replacementValue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{project.property.address}</h2>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}
              >
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {project.property.city}, {project.property.state} {project.property.zip}
            </p>
          </div>
        </div>
        {canWrite && (
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Property Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-sm font-medium">{project.property.address}</p>
            <p className="text-xs text-muted-foreground">
              {project.property.city}, {project.property.state} {project.property.zip}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              {project.property.sqft && (
                <span className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  {project.property.sqft.toLocaleString()} sqft
                </span>
              )}
              {project.property.bedrooms != null && (
                <span className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {project.property.bedrooms} bd
                </span>
              )}
              {project.property.bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  {project.property.bathrooms} ba
                </span>
              )}
            </div>
            {project.property.listingPrice != null && (
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                Listing: {formatCurrency(project.property.listingPrice)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-sm font-medium">{project.client.agentName}</p>
            {project.client.companyName && (
              <p className="text-xs text-muted-foreground">{project.client.companyName}</p>
            )}
            {project.client.brokerage && (
              <p className="text-xs text-muted-foreground">{project.client.brokerage}</p>
            )}
            {project.client.email && (
              <p className="text-xs text-muted-foreground">{project.client.email}</p>
            )}
            {project.client.phone && (
              <p className="text-xs text-muted-foreground">{project.client.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {project.totalPrice != null ? (
              <p className="text-lg font-bold">{formatCurrency(project.totalPrice)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
            {project.pricingType && (
              <Badge variant="outline">
                {PRICING_LABELS[project.pricingType] || project.pricingType}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">
              {project.projectItems.length} items assigned
              {totalItemValue > 0 && (
                <> ({formatCurrency(totalItemValue)} value)</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div>
              <p className="text-xs text-muted-foreground">Stage Date</p>
              <p className="text-sm font-medium">
                {project.stageDate ? formatDate(project.stageDate) : "Not scheduled"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Destage Date</p>
              <p className="text-sm font-medium">
                {project.destageDate ? formatDate(project.destageDate) : "Not scheduled"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "items"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("items")}
        >
          <Package className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Items ({project.projectItems.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "timeline"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("timeline")}
        >
          <History className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Timeline
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "documents"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("documents")}
        >
          <FileText className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Documents
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "items" && (
        <ItemsTab
          projectItems={project.projectItems}
          itemsByRoom={itemsByRoom}
          canWrite={canWrite}
          addItemsOpen={addItemsOpen}
          setAddItemsOpen={setAddItemsOpen}
          projectId={project.id}
          onRemoveItem={handleRemoveItem}
        />
      )}
      {activeTab === "timeline" && (
        <TimelineTab activityLog={activityLog} scheduleEvents={project.scheduleEvents} />
      )}
      {activeTab === "documents" && (
        <DocumentsTab
          proposals={project.proposals}
          contracts={project.contracts}
          invoices={project.invoices}
        />
      )}

      {/* Notes Section */}
      {project.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Items Tab ---

interface AvailableItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  photos: string[];
  status: string;
  condition: string;
  replacementValue: number | null;
}

function ItemsTab({
  projectItems,
  itemsByRoom,
  canWrite,
  addItemsOpen,
  setAddItemsOpen,
  projectId,
  onRemoveItem,
}: {
  projectItems: ProjectItemData[];
  itemsByRoom: Record<string, ProjectItemData[]>;
  canWrite: boolean;
  addItemsOpen: boolean;
  setAddItemsOpen: (open: boolean) => void;
  projectId: string;
  onRemoveItem: (projectItemId: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [roomAssignment, setRoomAssignment] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [addingItems, setAddingItems] = useState(false);

  const fetchAvailableItems = useCallback(async (query: string) => {
    setLoadingItems(true);
    try {
      const params = new URLSearchParams({ status: "AVAILABLE" });
      if (query) params.set("search", query);
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableItems(data.items || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (addItemsOpen) {
      fetchAvailableItems("");
    }
  }, [addItemsOpen, fetchAvailableItems]);

  const handleItemSearch = (value: string) => {
    setItemSearch(value);
    fetchAvailableItems(value);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleAddItems = async () => {
    if (selectedItemIds.length === 0) return;
    setAddingItems(true);

    try {
      const payload: Record<string, unknown> = {
        itemIds: selectedItemIds,
      };
      if (roomAssignment.trim()) {
        payload.roomAssignment = roomAssignment.trim();
      }

      const res = await fetch(`/api/projects/${projectId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add items");
      }

      toast({
        title: "Items added",
        description: `${selectedItemIds.length} item${selectedItemIds.length !== 1 ? "s" : ""} added to the project.`,
      });

      setAddItemsOpen(false);
      setSelectedItemIds([]);
      setRoomAssignment("");
      setItemSearch("");
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add items",
        variant: "destructive",
      });
    } finally {
      setAddingItems(false);
    }
  };

  // Filter out items already in the project
  const existingItemIds = new Set(projectItems.map((pi) => pi.itemId));
  const filteredAvailable = availableItems.filter(
    (item) => !existingItemIds.has(item.id)
  );

  const roomKeys = Object.keys(itemsByRoom).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Assigned Items ({projectItems.length})
        </h3>
        {canWrite && (
          <Button onClick={() => setAddItemsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Items
          </Button>
        )}
      </div>

      {projectItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h4 className="mt-3 text-sm font-semibold">No items assigned</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Add inventory items to this project to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {roomKeys.map((room) => (
            <div key={room}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {room}
              </h4>
              <div className="grid gap-2">
                {itemsByRoom[room].map((pi) => (
                  <div
                    key={pi.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Photo */}
                    <div className="h-12 w-12 shrink-0 rounded-md bg-muted overflow-hidden">
                      {pi.item.photos.length > 0 ? (
                        <img
                          src={pi.item.photos[0]}
                          alt={pi.item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/inventory/${pi.item.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {pi.item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {pi.item.sku} &middot; {pi.item.category}
                      </p>
                    </div>

                    {/* Value */}
                    {pi.item.replacementValue != null && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(pi.item.replacementValue)}
                      </span>
                    )}

                    {/* Status */}
                    <Badge variant="outline" className="text-[10px]">
                      {pi.item.status.replace("_", " ")}
                    </Badge>

                    {/* Remove */}
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onRemoveItem(pi.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Items Dialog */}
      <Dialog
        open={addItemsOpen}
        onOpenChange={(open) => {
          setAddItemsOpen(open);
          if (!open) {
            setSelectedItemIds([]);
            setRoomAssignment("");
            setItemSearch("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Items to Project</DialogTitle>
            <DialogDescription>
              Search and select available inventory items to assign to this project.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items by name, SKU..."
              value={itemSearch}
              onChange={(e) => handleItemSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Room Assignment */}
          <div className="grid gap-2">
            <Label htmlFor="roomAssignment">Room Assignment (optional)</Label>
            <Input
              id="roomAssignment"
              value={roomAssignment}
              onChange={(e) => setRoomAssignment(e.target.value)}
              placeholder="e.g., Living Room, Master Bedroom..."
            />
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto min-h-0 rounded-md border">
            {loadingItems ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">Loading items...</p>
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">
                  {itemSearch
                    ? "No matching available items found."
                    : "No available items."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAvailable.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex items-center gap-3 w-full p-3 text-left transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>

                      {/* Photo */}
                      <div className="h-10 w-10 shrink-0 rounded bg-muted overflow-hidden">
                        {item.photos.length > 0 ? (
                          <img
                            src={item.photos[0]}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku} &middot; {item.category}
                        </p>
                      </div>

                      {/* Value */}
                      {item.replacementValue != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(item.replacementValue)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedItemIds.length} item{selectedItemIds.length !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddItemsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddItems}
                disabled={selectedItemIds.length === 0 || addingItems}
              >
                {addingItems
                  ? "Adding..."
                  : `Add ${selectedItemIds.length} Item${selectedItemIds.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Timeline Tab ---

function TimelineTab({
  activityLog,
  scheduleEvents,
}: {
  activityLog: ActivityLogEntry[];
  scheduleEvents: ScheduleEventData[];
}) {
  // Merge activity log and schedule events into a single sorted timeline
  const timelineItems: {
    id: string;
    type: "activity" | "event";
    date: string;
    content: React.ReactNode;
  }[] = [];

  for (const entry of activityLog) {
    const details = entry.details as Record<string, string> | null;
    let description = entry.action.replace(/_/g, " ");
    if (details?.fromStatus && details?.toStatus) {
      description = `Status changed from ${STATUS_LABELS[details.fromStatus] || details.fromStatus} to ${STATUS_LABELS[details.toStatus] || details.toStatus}`;
    }

    timelineItems.push({
      id: entry.id,
      type: "activity",
      date: entry.createdAt,
      content: (
        <div className="pb-4 flex-1">
          <p className="text-sm font-medium">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {entry.user.name} &middot; {formatDate(entry.createdAt)}
          </p>
        </div>
      ),
    });
  }

  for (const event of scheduleEvents) {
    timelineItems.push({
      id: event.id,
      type: "event",
      date: event.date,
      content: (
        <div className="pb-4 flex-1">
          <p className="text-sm font-medium">
            {event.eventType.replace(/_/g, " ")} scheduled
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(event.date)}
            {event.startTime && ` at ${event.startTime}`}
            {event.endTime && ` - ${event.endTime}`}
          </p>
          {event.crew.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Crew: {event.crew.map((c) => c.name).join(", ")}
            </p>
          )}
          {event.notes && (
            <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>
          )}
        </div>
      ),
    });
  }

  // Sort by date descending
  timelineItems.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Project Timeline
        </CardTitle>
        <CardDescription>Status changes, events, and activity</CardDescription>
      </CardHeader>
      <CardContent>
        {timelineItems.length > 0 ? (
          <div className="space-y-0">
            {timelineItems.map((item) => (
              <div key={item.id} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-2 w-2 rounded-full mt-2 ${
                      item.type === "event" ? "bg-blue-500" : "bg-primary"
                    }`}
                  />
                  <div className="w-px flex-1 bg-border" />
                </div>
                {item.content}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Documents Tab ---

function DocumentsTab({
  proposals,
  contracts,
  invoices,
}: {
  proposals: ProposalData[];
  contracts: ContractData[];
  invoices: InvoiceData[];
}) {
  return (
    <div className="space-y-6">
      {/* Proposals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proposals</CardTitle>
          <CardDescription>
            {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {proposals.length > 0 ? (
            <div className="space-y-2">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">Version {p.version}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(p.createdAt)}
                      {p.sentAt && <> &middot; Sent {formatDate(p.sentAt)}</>}
                    </p>
                  </div>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No proposals yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contracts</CardTitle>
          <CardDescription>
            {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length > 0 ? (
            <div className="space-y-2">
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">Contract</p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(c.createdAt)}
                      {c.signedAt && <> &middot; Signed {formatDate(c.signedAt)}</>}
                    </p>
                  </div>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contracts yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
          <CardDescription>
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">#{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(inv.total)}
                      {inv.dueDate && <> &middot; Due {formatDate(inv.dueDate)}</>}
                      {inv.paidDate && <> &middot; Paid {formatDate(inv.paidDate)}</>}
                    </p>
                  </div>
                  <Badge variant="outline">{inv.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
