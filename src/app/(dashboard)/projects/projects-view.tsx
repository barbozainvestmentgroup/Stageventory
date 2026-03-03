"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  MapPin,
  User,
  DollarSign,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

// --- Types ---

interface PropertyData {
  id: string;
  address: string;
  city: string;
}

interface ClientData {
  id: string;
  agentName: string;
  companyName: string | null;
  properties: PropertyData[];
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
  property: {
    id: string;
    address: string;
    city: string;
  };
  client: {
    id: string;
    agentName: string;
    companyName: string | null;
  };
}

interface Props {
  projects: ProjectData[];
  canWrite: boolean;
  clients: ClientData[];
  initialView: "kanban" | "list";
  initialStatus: string;
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

const PIPELINE_STATUSES = ["CONSULTATION", "PROPOSAL", "CONTRACT"];
const ACTIVE_STATUSES = ["SCHEDULED", "STAGED", "ACTIVE", "DESTAGE_SCHEDULED"];
const COMPLETED_STATUSES = ["DESTAGED", "INVOICED", "CLOSED"];

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

const COLUMN_HEADER_COLORS: Record<string, string> = {
  CONSULTATION: "border-t-purple-500",
  PROPOSAL: "border-t-blue-500",
  CONTRACT: "border-t-indigo-500",
  SCHEDULED: "border-t-yellow-500",
  STAGED: "border-t-orange-500",
  ACTIVE: "border-t-green-500",
  DESTAGE_SCHEDULED: "border-t-amber-500",
  DESTAGED: "border-t-teal-500",
  INVOICED: "border-t-cyan-500",
  CLOSED: "border-t-gray-500",
};

const PRICING_LABELS: Record<string, string> = {
  MONTHLY_RENTAL: "Monthly",
  FLAT_FEE: "Flat Fee",
};

// --- Form ---

interface ProjectFormData {
  clientId: string;
  propertyId: string;
  status: string;
  pricingType: string;
  stageDate: string;
  destageDate: string;
  totalPrice: string;
  notes: string;
}

const emptyForm: ProjectFormData = {
  clientId: "",
  propertyId: "",
  status: "CONSULTATION",
  pricingType: "",
  stageDate: "",
  destageDate: "",
  totalPrice: "",
  notes: "",
};

// --- Status filter tabs ---

const FILTER_TABS = [
  { key: "", label: "All" },
  { key: "pipeline", label: "Pipeline" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

// --- Component ---

export function ProjectsView({
  projects,
  canWrite,
  clients,
  initialView,
  initialStatus,
}: Props) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"kanban" | "list">(initialView);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchInput, setSearchInput] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Get available properties for the selected client
  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const availableProperties = selectedClient?.properties || [];

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!searchInput.trim()) return projects;
    const query = searchInput.toLowerCase();
    return projects.filter(
      (p) =>
        p.property.address.toLowerCase().includes(query) ||
        p.property.city.toLowerCase().includes(query) ||
        p.client.agentName.toLowerCase().includes(query) ||
        (p.client.companyName && p.client.companyName.toLowerCase().includes(query))
    );
  }, [projects, searchInput]);

  // Group projects by status for Kanban
  const projectsByStatus = useMemo(() => {
    const groups: Record<string, ProjectData[]> = {};
    for (const status of ALL_STATUSES) {
      groups[status] = [];
    }
    for (const project of filteredProjects) {
      if (groups[project.status]) {
        groups[project.status].push(project);
      }
    }
    return groups;
  }, [filteredProjects]);

  // Determine which columns to show based on filter
  const visibleStatuses = useMemo(() => {
    let statusesToConsider: string[];

    if (statusFilter === "pipeline") {
      statusesToConsider = PIPELINE_STATUSES;
    } else if (statusFilter === "active") {
      statusesToConsider = ACTIVE_STATUSES;
    } else if (statusFilter === "completed") {
      statusesToConsider = COMPLETED_STATUSES;
    } else {
      statusesToConsider = Array.from(ALL_STATUSES);
    }

    // Show columns that either belong to the filter group or have projects
    return statusesToConsider.filter(
      (s) => projectsByStatus[s]?.length > 0 || statusFilter !== ""
    );
  }, [statusFilter, projectsByStatus]);

  // Navigate with params
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/projects?${params.toString()}`);
  };

  const handleViewChange = (mode: "kanban" | "list") => {
    setViewMode(mode);
    updateParams("view", mode);
  };

  const handleStatusFilter = (filter: string) => {
    setStatusFilter(filter);
    updateParams("status", filter);
  };

  // Reset property when client changes
  useEffect(() => {
    if (formData.clientId) {
      setFormData((prev) => ({ ...prev, propertyId: "" }));
    }
  }, [formData.clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        clientId: formData.clientId,
        propertyId: formData.propertyId,
        status: formData.status || "CONSULTATION",
      };

      if (formData.pricingType) payload.pricingType = formData.pricingType;
      if (formData.stageDate) payload.stageDate = formData.stageDate;
      if (formData.destageDate) payload.destageDate = formData.destageDate;
      if (formData.totalPrice) payload.totalPrice = parseFloat(formData.totalPrice);
      if (formData.notes) payload.notes = formData.notes;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      toast({
        title: "Project created",
        description: "The new project has been created successfully.",
      });

      setIsDialogOpen(false);
      setFormData(emptyForm);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => handleViewChange("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => handleViewChange("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* New Project Button */}
          {canWrite && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setFormData(emptyForm);
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>New Project</DialogTitle>
                    <DialogDescription>
                      Create a new staging project for a property.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {/* Client Selector */}
                    <div className="grid gap-2">
                      <Label htmlFor="clientId">Client *</Label>
                      <Select
                        value={formData.clientId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, clientId: value, propertyId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.agentName}
                              {client.companyName ? ` (${client.companyName})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Property Selector */}
                    <div className="grid gap-2">
                      <Label htmlFor="propertyId">Property *</Label>
                      <Select
                        value={formData.propertyId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, propertyId: value })
                        }
                        disabled={!formData.clientId}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              formData.clientId
                                ? availableProperties.length > 0
                                  ? "Select a property"
                                  : "No properties for this client"
                                : "Select a client first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.address}, {property.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.clientId && availableProperties.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          This client has no properties. Add a property from the client
                          page first.
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
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
                    </div>

                    {/* Pricing Type */}
                    <div className="grid gap-2">
                      <Label htmlFor="pricingType">Pricing Type</Label>
                      <Select
                        value={formData.pricingType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, pricingType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pricing type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY_RENTAL">Monthly Rental</SelectItem>
                          <SelectItem value="FLAT_FEE">Flat Fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="stageDate">Stage Date</Label>
                        <Input
                          id="stageDate"
                          type="date"
                          value={formData.stageDate}
                          onChange={(e) =>
                            setFormData({ ...formData, stageDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="destageDate">Destage Date</Label>
                        <Input
                          id="destageDate"
                          type="date"
                          value={formData.destageDate}
                          onChange={(e) =>
                            setFormData({ ...formData, destageDate: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="grid gap-2">
                      <Label htmlFor="totalPrice">Total Price</Label>
                      <Input
                        id="totalPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.totalPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, totalPrice: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes</Label>
                      <textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Additional notes about this project..."
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !formData.clientId || !formData.propertyId}
                    >
                      {submitting ? "Creating..." : "Create Project"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by address, client..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchInput
              ? "Try adjusting your search terms."
              : "Get started by creating your first project."}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView
          projectsByStatus={projectsByStatus}
          visibleStatuses={visibleStatuses}
        />
      ) : (
        <ListView projects={filteredProjects} />
      )}
    </div>
  );
}

// --- Kanban View ---

function KanbanView({
  projectsByStatus,
  visibleStatuses,
}: {
  projectsByStatus: Record<string, ProjectData[]>;
  visibleStatuses: string[];
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleStatuses.map((status) => (
        <div
          key={status}
          className={`flex-shrink-0 w-72 rounded-lg border border-t-4 bg-muted/30 ${COLUMN_HEADER_COLORS[status]}`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between p-3">
            <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
            <Badge variant="secondary" className="text-xs">
              {projectsByStatus[status]?.length || 0}
            </Badge>
          </div>

          {/* Cards */}
          <div className="space-y-2 p-2 pt-0 min-h-[100px]">
            {(projectsByStatus[status] || []).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectData }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{project.property.address}</p>
              <p className="text-xs text-muted-foreground">{project.property.city}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {project.client.companyName || project.client.agentName}
            </span>
          </div>

          {(project.stageDate || project.destageDate) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {project.stageDate ? formatDate(project.stageDate) : "TBD"}
                {" - "}
                {project.destageDate ? formatDate(project.destageDate) : "TBD"}
              </span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            {project.pricingType && (
              <Badge variant="outline" className="text-[10px]">
                {PRICING_LABELS[project.pricingType] || project.pricingType}
              </Badge>
            )}
            {project.totalPrice != null && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                {formatCurrency(project.totalPrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// --- List View ---

function ListView({ projects }: { projects: ProjectData[] }) {
  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Property
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Client
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Stage Date
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Destage Date
              </th>
              <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                Price
              </th>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Pricing Type
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium hover:underline"
                  >
                    {project.property.address}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {project.property.city}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">
                    {project.client.companyName || project.client.agentName}
                  </span>
                  {project.client.companyName && (
                    <p className="text-xs text-muted-foreground">
                      {project.client.agentName}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {project.stageDate ? formatDate(project.stageDate) : "--"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {project.destageDate ? formatDate(project.destageDate) : "--"}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  {project.totalPrice != null
                    ? formatCurrency(project.totalPrice)
                    : "--"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {project.pricingType
                    ? PRICING_LABELS[project.pricingType] || project.pricingType
                    : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
