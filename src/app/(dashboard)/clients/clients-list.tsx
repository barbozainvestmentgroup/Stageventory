"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  Star,
  Building2,
  Mail,
  Phone,
  Home,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

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
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    properties: number;
    projects: number;
  };
  totalRevenue: number;
}

interface Props {
  clients: ClientData[];
  canWrite: boolean;
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

const emptyForm: ClientFormData = {
  companyName: "",
  agentName: "",
  email: "",
  phone: "",
  brokerage: "",
  preferredStyle: "",
  rating: 0,
  notes: "",
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

export function ClientsList({ clients, canWrite }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const filteredClients = useMemo(() => {
    if (!searchInput.trim()) return clients;
    const query = searchInput.toLowerCase();
    return clients.filter(
      (c) =>
        c.agentName.toLowerCase().includes(query) ||
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.brokerage && c.brokerage.toLowerCase().includes(query))
    );
  }, [clients, searchInput]);

  const openCreateDialog = () => {
    setEditingClient(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: ClientData) => {
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || "",
      agentName: client.agentName,
      email: client.email || "",
      phone: client.phone || "",
      brokerage: client.brokerage || "",
      preferredStyle: client.preferredStyle || "",
      rating: client.rating || 0,
      notes: client.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        rating: formData.rating || 0,
      };

      const url = editingClient
        ? `/api/clients/${editingClient.id}`
        : "/api/clients";
      const method = editingClient ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save client");
      }

      toast({
        title: editingClient ? "Client updated" : "Client created",
        description: `${formData.agentName} has been ${editingClient ? "updated" : "added"} successfully.`,
      });

      setIsDialogOpen(false);
      setEditingClient(null);
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
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {canWrite && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingClient(null);
              setFormData(emptyForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? "Edit Client" : "Add New Client"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingClient
                      ? "Update the client information below."
                      : "Enter the client details to create a new record."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="agentName">Agent Name *</Label>
                    <Input
                      id="agentName"
                      value={formData.agentName}
                      onChange={(e) =>
                        setFormData({ ...formData, agentName: e.target.value })
                      }
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({ ...formData, companyName: e.target.value })
                      }
                      placeholder="Acme Realty"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="brokerage">Brokerage</Label>
                    <Input
                      id="brokerage"
                      value={formData.brokerage}
                      onChange={(e) =>
                        setFormData({ ...formData, brokerage: e.target.value })
                      }
                      placeholder="Keller Williams"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="preferredStyle">Preferred Style</Label>
                    <Input
                      id="preferredStyle"
                      value={formData.preferredStyle}
                      onChange={(e) =>
                        setFormData({ ...formData, preferredStyle: e.target.value })
                      }
                      placeholder="Modern, Coastal, Traditional..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Rating</Label>
                    <RatingStars
                      rating={formData.rating}
                      interactive
                      onChange={(value) =>
                        setFormData({ ...formData, rating: value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional notes about this client..."
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
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? "Saving..."
                      : editingClient
                        ? "Update Client"
                        : "Create Client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Client Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No clients found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchInput
              ? "Try adjusting your search terms."
              : "Get started by adding your first client."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                    <div>
                      {client.companyName && (
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                          {client.companyName}
                        </h3>
                      )}
                      <p className={`text-sm ${client.companyName ? "text-muted-foreground" : "font-semibold text-base group-hover:text-primary transition-colors"} truncate`}>
                        {client.agentName}
                      </p>
                    </div>
                  </Link>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
                      onClick={(e) => {
                        e.preventDefault();
                        openEditDialog(client);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                <Link href={`/clients/${client.id}`} className="block mt-3 space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.brokerage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.brokerage}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    {client.preferredStyle && (
                      <Badge variant="outline" className="text-[10px]">
                        {client.preferredStyle}
                      </Badge>
                    )}
                    {(client.rating ?? 0) > 0 && (
                      <RatingStars rating={client.rating || 0} />
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Home className="h-3.5 w-3.5" />
                      <span>{client._count.properties} properties</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span>{client._count.projects} projects</span>
                    </div>
                  </div>

                  {client.totalRevenue > 0 && (
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(client.totalRevenue)} revenue
                    </div>
                  )}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
