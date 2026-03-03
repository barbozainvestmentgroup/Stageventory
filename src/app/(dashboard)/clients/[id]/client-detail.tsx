"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Star,
  Mail,
  Phone,
  Building2,
  Home,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  DollarSign,
  FolderKanban,
  History,
  MessageSquare,
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceData {
  total: number;
  status: string;
}

interface ProjectData {
  id: string;
  status: string;
  stageDate: string | null;
  destageDate: string | null;
  totalPrice: number | null;
  pricingType: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string };
  invoices: InvoiceData[];
}

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
  createdAt: string;
  projects: ProjectData[];
}

interface ProjectWithProperty {
  id: string;
  status: string;
  stageDate: string | null;
  destageDate: string | null;
  totalPrice: number | null;
  pricingType: string | null;
  notes: string | null;
  createdAt: string;
  property: { address: string; city: string };
  invoices: InvoiceData[];
}

interface ClientData {
  id: string;
  companyName: string | null;
  agentName: string;
  email: string | null;
  phone: string | null;
  brokerage: string | null;
  notes: string | null;
  preferredStyle: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  properties: PropertyData[];
  projects: ProjectWithProperty[];
}

interface ClientFormData {
  companyName: string;
  agentName: string;
  email: string;
  phone: string;
  brokerage: string;
  preferredStyle: string;
  rating: number;
  notes: string;
}

interface PropertyFormData {
  address: string;
  city: string;
  state: string;
  zip: string;
  sqft: string;
  bedrooms: string;
  bathrooms: string;
  listingPrice: string;
  mlsNumber: string;
  notes: string;
}

const emptyPropertyForm: PropertyFormData = {
  address: "",
  city: "",
  state: "FL",
  zip: "",
  sqft: "",
  bedrooms: "",
  bathrooms: "",
  listingPrice: "",
  mlsNumber: "",
  notes: "",
};

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  CONSULTATION: "secondary",
  PROPOSAL: "secondary",
  CONTRACT: "default",
  SCHEDULED: "warning",
  STAGED: "default",
  ACTIVE: "success",
  DESTAGE_SCHEDULED: "warning",
  DESTAGED: "secondary",
  INVOICED: "warning",
  CLOSED: "secondary",
};

function RatingStars({ rating, interactive, onChange }: {
  rating: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i + 1)}
          className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
        >
          <Star
            className={`h-4 w-4 ${
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ClientDetail({ client, canWrite }: { client: ClientData; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [clientForm, setClientForm] = useState<ClientFormData>({
    companyName: client.companyName || "",
    agentName: client.agentName,
    email: client.email || "",
    phone: client.phone || "",
    brokerage: client.brokerage || "",
    preferredStyle: client.preferredStyle || "",
    rating: client.rating || 0,
    notes: client.notes || "",
  });

  const [propertyForm, setPropertyForm] = useState<PropertyFormData>(emptyPropertyForm);

  // Revenue summary
  const totalRevenue = client.projects.reduce(
    (sum, p) => sum + (p.totalPrice || 0),
    0
  );
  const totalInvoiced = client.projects.reduce(
    (sum, p) => sum + p.invoices.reduce((iSum, inv) => iSum + inv.total, 0),
    0
  );
  const paidInvoices = client.projects.reduce(
    (sum, p) => sum + p.invoices.filter((inv) => inv.status === "PAID").reduce((iSum, inv) => iSum + inv.total, 0),
    0
  );

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...clientForm,
        rating: clientForm.rating || 0,
      };

      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update client");
      }

      toast({
        title: "Client updated",
        description: `${clientForm.agentName} has been updated successfully.`,
      });

      setIsEditOpen(false);
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

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        clientId: client.id,
        address: propertyForm.address,
        city: propertyForm.city,
        state: propertyForm.state,
        zip: propertyForm.zip,
        sqft: propertyForm.sqft ? parseInt(propertyForm.sqft) : undefined,
        bedrooms: propertyForm.bedrooms ? parseInt(propertyForm.bedrooms) : undefined,
        bathrooms: propertyForm.bathrooms ? parseFloat(propertyForm.bathrooms) : undefined,
        listingPrice: propertyForm.listingPrice ? parseFloat(propertyForm.listingPrice) : undefined,
        mlsNumber: propertyForm.mlsNumber || undefined,
        notes: propertyForm.notes || undefined,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add property");
      }

      toast({
        title: "Property added",
        description: `${propertyForm.address} has been added successfully.`,
      });

      setIsPropertyOpen(false);
      setPropertyForm(emptyPropertyForm);
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
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                {client.companyName || client.agentName}
              </h2>
              {(client.rating ?? 0) > 0 && (
                <RatingStars rating={client.rating || 0} />
              )}
            </div>
            {client.companyName && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {client.agentName}
              </p>
            )}
          </div>
        </div>
        {canWrite && (
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {client.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{client.email}</p>
                    </div>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.brokerage && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Brokerage</p>
                      <p className="text-sm font-medium">{client.brokerage}</p>
                    </div>
                  </div>
                )}
                {client.preferredStyle && (
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Style</p>
                    <Badge variant="outline" className="mt-1">
                      {client.preferredStyle}
                    </Badge>
                  </div>
                )}
                {client.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Properties
                </CardTitle>
                <CardDescription>
                  {client.properties.length} propert{client.properties.length !== 1 ? "ies" : "y"}
                </CardDescription>
              </div>
              {canWrite && (
                <Button size="sm" onClick={() => setIsPropertyOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {client.properties.length > 0 ? (
                <div className="space-y-3">
                  {client.properties.map((property) => (
                    <div
                      key={property.id}
                      className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <h4 className="font-medium text-sm truncate">
                              {property.address}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {property.city}, {property.state} {property.zip}
                          </p>
                        </div>
                        {canWrite && (
                          <Link href={`/projects?propertyId=${property.id}&clientId=${client.id}`}>
                            <Button variant="outline" size="sm">
                              <Plus className="mr-1 h-3 w-3" />
                              New Project
                            </Button>
                          </Link>
                        )}
                      </div>

                      <div className="mt-3 ml-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {property.sqft && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" />
                            {property.sqft.toLocaleString()} sqft
                          </span>
                        )}
                        {property.bedrooms != null && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" />
                            {property.bedrooms} bed
                          </span>
                        )}
                        {property.bathrooms != null && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {property.bathrooms} bath
                          </span>
                        )}
                        {property.listingPrice != null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(property.listingPrice)}
                          </span>
                        )}
                        {property.mlsNumber && (
                          <span>MLS# {property.mlsNumber}</span>
                        )}
                      </div>

                      {property.projects.length > 0 && (
                        <div className="mt-3 ml-6 flex flex-wrap gap-1.5">
                          {property.projects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                              <Badge
                                variant={statusColors[project.status] || "secondary"}
                                className="text-[10px] cursor-pointer hover:opacity-80"
                              >
                                {project.status.replace(/_/g, " ")}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Home className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No properties yet. Add one to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Revenue Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Project Value</span>
                <span className="font-medium">{formatCurrency(totalRevenue)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invoiced</span>
                <span className="font-medium">{formatCurrency(totalInvoiced)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(paidInvoices)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(totalInvoiced - paidInvoices)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Project History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Project History
              </CardTitle>
              <CardDescription>
                {client.projects.length} project{client.projects.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.projects.length > 0 ? (
                <div className="space-y-3">
                  {client.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">
                        {project.property.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.property.city}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge
                          variant={statusColors[project.status] || "secondary"}
                          className="text-[10px]"
                        >
                          {project.status.replace(/_/g, " ")}
                        </Badge>
                        {project.totalPrice != null && (
                          <span className="text-xs font-medium">
                            {formatCurrency(project.totalPrice)}
                          </span>
                        )}
                      </div>
                      {project.stageDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Staged: {formatDate(project.stageDate)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No projects yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Communication Log Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication Log
              </CardTitle>
              <CardDescription>Track interactions with this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <History className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Communication tracking coming soon.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Client Since</span>
                <span>{formatDate(client.createdAt)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatDate(client.updatedAt)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Properties</span>
                <span className="font-medium">{client.properties.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Projects</span>
                <span className="font-medium">{client.projects.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditClient}>
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Update the client information below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-agentName">Agent Name *</Label>
                <Input
                  id="edit-agentName"
                  value={clientForm.agentName}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, agentName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-companyName">Company Name</Label>
                <Input
                  id="edit-companyName"
                  value={clientForm.companyName}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, companyName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-brokerage">Brokerage</Label>
                <Input
                  id="edit-brokerage"
                  value={clientForm.brokerage}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, brokerage: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-preferredStyle">Preferred Style</Label>
                <Input
                  id="edit-preferredStyle"
                  value={clientForm.preferredStyle}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, preferredStyle: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Rating</Label>
                <RatingStars
                  rating={clientForm.rating}
                  interactive
                  onChange={(value) =>
                    setClientForm({ ...clientForm, rating: value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <textarea
                  id="edit-notes"
                  value={clientForm.notes}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, notes: e.target.value })
                  }
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Update Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Property Dialog */}
      <Dialog open={isPropertyOpen} onOpenChange={setIsPropertyOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddProperty}>
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
              <DialogDescription>
                Add a new property for {client.companyName || client.agentName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="prop-address">Address *</Label>
                <Input
                  id="prop-address"
                  value={propertyForm.address}
                  onChange={(e) =>
                    setPropertyForm({ ...propertyForm, address: e.target.value })
                  }
                  placeholder="123 Main St"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prop-city">City *</Label>
                  <Input
                    id="prop-city"
                    value={propertyForm.city}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, city: e.target.value })
                    }
                    placeholder="Tampa"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prop-state">State</Label>
                  <Input
                    id="prop-state"
                    value={propertyForm.state}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, state: e.target.value })
                    }
                    placeholder="FL"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prop-zip">ZIP *</Label>
                  <Input
                    id="prop-zip"
                    value={propertyForm.zip}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, zip: e.target.value })
                    }
                    placeholder="33602"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prop-sqft">Sqft</Label>
                  <Input
                    id="prop-sqft"
                    type="number"
                    value={propertyForm.sqft}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, sqft: e.target.value })
                    }
                    placeholder="2000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prop-bedrooms">Beds</Label>
                  <Input
                    id="prop-bedrooms"
                    type="number"
                    value={propertyForm.bedrooms}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, bedrooms: e.target.value })
                    }
                    placeholder="3"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prop-bathrooms">Baths</Label>
                  <Input
                    id="prop-bathrooms"
                    type="number"
                    step="0.5"
                    value={propertyForm.bathrooms}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, bathrooms: e.target.value })
                    }
                    placeholder="2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prop-listingPrice">Listing Price</Label>
                  <Input
                    id="prop-listingPrice"
                    type="number"
                    value={propertyForm.listingPrice}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, listingPrice: e.target.value })
                    }
                    placeholder="450000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prop-mlsNumber">MLS Number</Label>
                  <Input
                    id="prop-mlsNumber"
                    value={propertyForm.mlsNumber}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, mlsNumber: e.target.value })
                    }
                    placeholder="A12345678"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prop-notes">Notes</Label>
                <textarea
                  id="prop-notes"
                  value={propertyForm.notes}
                  onChange={(e) =>
                    setPropertyForm({ ...propertyForm, notes: e.target.value })
                  }
                  placeholder="Additional notes about this property..."
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPropertyOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Property"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
