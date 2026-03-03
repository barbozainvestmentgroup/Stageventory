"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate } from "@/lib/utils";
import {
  Plus,
  FileText,
  FileSignature,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";

interface Project {
  id: string;
  status: string;
  property: { id: string; address: string; city: string };
  client: { id: string; agentName: string; companyName: string | null };
}

interface Proposal {
  id: string;
  projectId: string;
  version: number;
  contentJson: Record<string, unknown> | null;
  pdfUrl: string | null;
  status: string;
  sentAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  project: Project;
}

interface Contract {
  id: string;
  projectId: string;
  proposalId: string | null;
  docusignId: string | null;
  status: string;
  signedAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  project: Project;
}

interface ProposalsPageProps {
  proposals: Proposal[];
  contracts: Contract[];
  projects: Project[];
  canWrite: boolean;
}

const proposalStatusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  SENT: { variant: "warning", label: "Sent" },
  VIEWED: { variant: "default", label: "Viewed" },
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  EXPIRED: { variant: "outline", label: "Expired" },
};

const contractStatusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  SENT: { variant: "warning", label: "Sent" },
  VIEWED: { variant: "default", label: "Viewed" },
  SIGNED: { variant: "success", label: "Signed" },
  EXPIRED: { variant: "destructive", label: "Expired" },
  CANCELLED: { variant: "outline", label: "Cancelled" },
};

export function ProposalsPage({ proposals, contracts, projects, canWrite }: ProposalsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"proposals" | "contracts">("proposals");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);

  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const proposalTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const filteredProposals = statusFilter === "all"
    ? proposals
    : proposals.filter((p) => p.status === statusFilter);

  const filteredContracts = statusFilter === "all"
    ? contracts
    : contracts.filter((c) => c.status === statusFilter);

  const handleCreateProposal = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          contentJson: {
            lineItems: lineItems.filter((li) => li.description),
            total: proposalTotal,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create proposal");
      }
      toast({ title: "Proposal created successfully" });
      setShowNewProposal(false);
      setSelectedProjectId("");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create proposal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create contract");
      }
      toast({ title: "Contract created successfully" });
      setShowNewContract(false);
      setSelectedProjectId("");
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create contract", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (type: "proposals" | "contracts", id: string, newStatus: string) => {
    try {
      const endpoint = type === "proposals" ? `/api/proposals/${id}` : `/api/contracts/${id}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast({ title: `Status updated to ${newStatus}` });
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (type: "proposals" | "contracts", id: string) => {
    try {
      const endpoint = type === "proposals" ? `/api/proposals/${id}` : `/api/contracts/${id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast({ title: `${type === "proposals" ? "Proposal" : "Contract"} deleted` });
      router.refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Proposals & Contracts</h2>
          <p className="text-muted-foreground">
            Manage proposals and contracts for staging projects
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Dialog open={showNewProposal} onOpenChange={setShowNewProposal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Proposal</DialogTitle>
                  <DialogDescription>Create a new proposal for a project</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.property.address}, {p.property.city} - {p.client.agentName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Line Items</Label>
                    <div className="space-y-2 mt-2">
                      {lineItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addLineItem}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add Line Item
                      </Button>
                    </div>
                    <p className="text-sm font-medium mt-2">
                      Total: ${proposalTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewProposal(false)}>Cancel</Button>
                  <Button onClick={handleCreateProposal} disabled={!selectedProjectId || loading}>
                    {loading ? "Creating..." : "Create Proposal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showNewContract} onOpenChange={setShowNewContract}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  New Contract
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Contract</DialogTitle>
                  <DialogDescription>Create a new contract for a project</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.property.address}, {p.property.city} - {p.client.agentName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewContract(false)}>Cancel</Button>
                  <Button onClick={handleCreateContract} disabled={!selectedProjectId || loading}>
                    {loading ? "Creating..." : "Create Contract"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => { setActiveTab("proposals"); setStatusFilter("all"); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "proposals"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="inline mr-2 h-4 w-4" />
          Proposals ({proposals.length})
        </button>
        <button
          onClick={() => { setActiveTab("contracts"); setStatusFilter("all"); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "contracts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSignature className="inline mr-2 h-4 w-4" />
          Contracts ({contracts.length})
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>All</Button>
        {activeTab === "proposals" &&
          Object.entries(proposalStatusConfig).map(([key, config]) => (
            <Button key={key} variant={statusFilter === key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(key)}>{config.label}</Button>
          ))}
        {activeTab === "contracts" &&
          Object.entries(contractStatusConfig).map(([key, config]) => (
            <Button key={key} variant={statusFilter === key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(key)}>{config.label}</Button>
          ))}
      </div>

      {/* Content */}
      {activeTab === "proposals" && (
        <div className="space-y-3">
          {filteredProposals.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No proposals found</CardContent></Card>
          ) : (
            filteredProposals.map((proposal) => {
              const config = proposalStatusConfig[proposal.status] || { variant: "outline" as const, label: proposal.status };
              const content = proposal.contentJson as Record<string, unknown> | null;
              const total = content?.total as number | undefined;
              return (
                <Card key={proposal.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Proposal v{proposal.version}</h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {proposal.project.property.address}, {proposal.project.property.city} &middot; {proposal.project.client.agentName}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Created: {formatDate(proposal.createdAt)}</span>
                          {proposal.sentAt && <span>Sent: {formatDate(proposal.sentAt)}</span>}
                          {proposal.approvedAt && <span>Approved: {formatDate(proposal.approvedAt)}</span>}
                          {total != null && <span className="font-medium text-foreground">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1">
                          {proposal.status === "DRAFT" && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange("proposals", proposal.id, "SENT")}>
                                <Send className="mr-1 h-3 w-3" />Send
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete("proposals", proposal.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {(proposal.status === "SENT" || proposal.status === "VIEWED") && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange("proposals", proposal.id, "APPROVED")}>
                                <CheckCircle className="mr-1 h-3 w-3" />Approve
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange("proposals", proposal.id, "REJECTED")}>
                                <XCircle className="mr-1 h-3 w-3" />Reject
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No contracts found</CardContent></Card>
          ) : (
            filteredContracts.map((contract) => {
              const config = contractStatusConfig[contract.status] || { variant: "outline" as const, label: contract.status };
              return (
                <Card key={contract.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Contract</h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {contract.project.property.address}, {contract.project.property.city} &middot; {contract.project.client.agentName}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Created: {formatDate(contract.createdAt)}</span>
                          {contract.signedAt && <span>Signed: {formatDate(contract.signedAt)}</span>}
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1">
                          {contract.status === "DRAFT" && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange("contracts", contract.id, "SENT")}>
                                <Send className="mr-1 h-3 w-3" />Send
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete("contracts", contract.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {(contract.status === "SENT" || contract.status === "VIEWED") && (
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange("contracts", contract.id, "SIGNED")}>
                              <CheckCircle className="mr-1 h-3 w-3" />Mark Signed
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
